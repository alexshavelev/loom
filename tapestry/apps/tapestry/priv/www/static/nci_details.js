NCI.setupCommunities = function(data){
	NCI.Communities = data.Communities;
	
	// for (var k = 0; k < 50; k++){
	// 	var fakeEndpoints = [];
	// 	var fakeInteractions = [];
	//     for (var i=1; i< 5; i++){
	// 	    fakeEndpoints.push(k*5 + i + "");
	//     }
	//     for (var j=2; j< 5; j++){
	// 	    fakeInteractions.push([k*5 + 1 + "", k*5 + j + ""]);
	//     }
	//     NCI.Communities.push({"Endpoints" : fakeEndpoints, "Interactions" : fakeInteractions});
	// };
	// 
	NCI.Communities.sort(function(a, b){
		return a.Endpoints.length > b.Endpoints.length;
	});
	NCI.timestampNCI = data.NCI;
	NCI.timestamp = data.Time;
	$("#histogramGeneral").html("<b>NETWORK COMPLEXITY INDEX at &nbsp;&nbsp;</b> <i>" + NCI.parceDateForLastUpdate(NCI.timestamp) + "</i>" +
	    "&nbsp;&nbsp;&nbsp;<span class='button alert'>NCI " + NCI.timestampNCI + "</span>" );
};

NCI.nciHistogram = (function(){
	var me = $('#nciHistogram');
	
	var barWidth = 4;
	var chart = d3.select("#nciHistogram");
	var margin = {top: 40, right: 40, bottom: 40, left:40},
	    width = 600,
	    height = 350;
	
	me.show = function(){
		chart.text("");
		var endpointsMax = d3.max(NCI.Communities, function(d) { return d.Endpoints.length; });
		var endpointsMin;
		var endpointsScale;
		if (endpointsMax > 100) {
			endpointsMin = 1;
			endpointsScale = d3.scale.log();
		} else {
			endpointsMin = 0;
			endpointsScale = d3.scale.linear();
		}
		endpointsScale.domain([endpointsMax, endpointsMin])
				.range([0, height - margin.top - margin.bottom]);
		
		var activitiesScale;
		var activitiesMin;
		if (NCI.Communities.length > 60) {
			activitiesMin = 0.9;
			activitiesScale = d3.scale.log();
		} else {
			activitiesMin = 0;
			activitiesScale = d3.scale.linear();
		}
		activitiesScale.domain([NCI.Communities.length + 1, activitiesMin])
					    .range([width - margin.right - margin.left, margin.left]);

		var activitiesAxis = d3.svg.axis()
		    .scale(activitiesScale)
		    .orient('bottom')
		    .tickSize(0)
			.ticks(Math.min(NCI.Communities.length + 2, 10),  d3.format("d"))
		    .tickPadding(8);

		var endpointsAxis = d3.svg.axis()
		    .scale(endpointsScale)
		    .orient('left')
			.tickSize(0)
			.ticks(10,  d3.format("d"))
		    .tickPadding(10);

		var barChartSvg = chart.append('svg')
		    .attr('width', width)
		    .attr('height', height)
		    .append('g')
		    .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

        //draw and animate bars
        var index = 0;
		barChartSvg.selectAll('g')
		    .data(NCI.Communities)
		    .enter().append('rect')
		    .attr('x', function(d) { return activitiesScale(NCI.Communities.length - index++) - barWidth/2})
		    .attr('y', function(d) { return   endpointsScale(d.Endpoints.length)}) //- selfwidth
		    .attr('width', function(d) { return barWidth})
		    .attr('height',function(d) { return height - margin.top - margin.bottom - endpointsScale(d.Endpoints.length) })
			.on("click", me.showDetails);

		barChartSvg.append("circle").attr("cy", endpointsScale(NCI.timestampNCI))
		    .attr("cx", activitiesScale(NCI.timestampNCI) ).style("fill", "red").attr("r", 6);	
	    barChartSvg.append("circle").attr("cy", endpointsScale(endpointsMin))
		    .attr("cx", activitiesScale(NCI.timestampNCI) ).style("fill", "red").attr("r", 4);
		barChartSvg.append("circle").attr("cy", endpointsScale(NCI.timestampNCI))
		    .attr("cx", activitiesScale(activitiesMin) ).style("fill", "red").attr("r", 4);
		//draw axis 	
		barChartSvg.append('g')
		    .attr('class', 'x axis')
			.attr('transform', 'translate(0,' + (height - margin.top - margin.bottom) + ')')
			.call(activitiesAxis);
		barChartSvg.append('g')
			.attr('class', 'y axis')
			.attr('transform', 'translate(' + margin.left + ')')
			.call(endpointsAxis);	
		//draw axis labels																					
		barChartSvg.append('text').
		attr('style', 'font-weight:bold').
		html('Activities Sorted by Size&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;j').attr('x', width/2 - 100).attr('y', height - 45);
		barChartSvg.append('text').
		attr('style', 'font-weight:bold').
		html('Number of Endpoints per Activity&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;x[j]').attr('x', -height/2 - 40).attr('y', 0)
		.attr('transform', 'rotate(-90)');
		//axis names, formula

	};
	
	me.showDetails = function(d){
		chart.select("#bar_endpoints").remove();
		var detailsDim = 300;
		var activityDetails = chart.append('svg')
			.attr("id","bar_endpoints")
			.attr('width', detailsDim)
		    .attr('height', detailsDim);
			
	    var graph = NCI.prepareDataForForceGraph([d]);
		
		var force = d3.layout.force()
			.charge(-60)
			.linkDistance(30)
			.size([detailsDim, detailsDim])
			.linkStrength(1).nodes(graph.nodes).links(graph.links).start();
			
		var link = activityDetails.selectAll(".link")
		    .data(graph.links)
			.enter().append("line")
			.attr("class", "activities_link")
			.style("stroke-width", function(d) { return Math.sqrt(d.value); });  	
				  
		var node = activityDetails.selectAll(".node")
		    .data(graph.nodes)
		    .enter().append("circle")
		    .attr("r", 5);
		  		  
		node.append("title").html(function(d) {  return d.name + "<br>" + d.neighbours + " connections" ;});

		force.on("tick", function() { 
			link.attr("x1", function(d) { return d.source.x; })
			    .attr("y1", function(d) { return d.source.y; })
				.attr("x2", function(d) { return d.target.x; })
				.attr("y2", function(d) { return d.target.y; });
				
			node.attr("cx", function(d) { return d.x; })
			    .attr("cy", function(d) { return d.y; });
		});	  
	};
	
	return me;
}());

NCI.socialGraph  = (function(){
	var me = $("#socialGraph");
	
	var force;
	var color = d3.scale.category10();
	me.clustered = false;
	var networkColor = "#000000";
	
	me.show = function(devided, clustered, filtered){
		if (me.clustered && !clustered){
			NCI.socialGraph.text("");
			me.draw(devided, clustered);
			me.clustered  = clustered;
			return;
		}
		me.clustered = clustered;
		if (me.text().length<20){	
			me.draw(devided, clustered, filtered);
		} else {
			me.setupNodes(filtered, devided, clustered);
	  	    force.start();
		}
	};
	
	me.setupNodes = function(filtered, devided, clustered){
		me.node.style("fill", function(d) { 
		    if ( filtered && (d.name.indexOf("10.") == 0 ||  d.name.indexOf("192.168") == 0)){
			    return networkColor;
		    }
		    return devided ? color(d.group) : color(0);
		});
		me.node.attr("r", function(d) { return (filtered &&  (d.name.indexOf("10.") == 0 ||  d.name.indexOf("192.168") == 0)) ? 6 : 4})
		force.linkStrength(clustered ? 1 : 0);
	}
	
	me.draw = function(devided, clustered, filtered){
		d3.select("#activities_graph").remove();
	    me.graph = NCI.prepareDataForForceGraph(NCI.Communities);
		
		force = d3.layout.force()
		    .charge(-20)
			.linkDistance(30)
			.size([$('#nciDetails').width(),  $('#nciDetails').height() - 200 ])
			//.resume()
			//.gravity(0.1)
			.linkStrength(clustered ? 1 : 0)
			.nodes(me.graph.nodes).links(me.graph.links).start();
			
	    me.activitiesGraphSvg = d3.select("#socialGraph").append("svg")
		    .attr("id","activities_graph")
			.attr("width", $('#nciDetails').width())
			.attr("height", $('#nciDetails').height() - 200);
	  
		var link = me.activitiesGraphSvg.selectAll(".link")
		    .data(me.graph.links)
			.enter().append("line")
			.attr("class", "activities_link")
			.style("stroke-width", function(d) { return Math.sqrt(d.value); });  	
		  
		me.node = me.activitiesGraphSvg.selectAll(".node")
		    .data(me.graph.nodes)
			.enter().append("circle");
			//.classed("fixed",  function(d) {d.fixed = true})
		me.setupNodes(filtered, devided, clustered);
		// node.on("mouseover", function(d, e) { console.log( d); console.log(e) })
		me.node.append("title").html(function(d) { return d.name + "<br>" + d.neighbours + " connections" ; });

	    force.on("tick", function() { 
	        link.attr("x1", function(d) { return d.source.x; })
	            .attr("y1", function(d) { return d.source.y; })
	            .attr("x2", function(d) { return d.target.x; })
	            .attr("y2", function(d) { return d.target.y; });

	        me.node.attr("cx", function(d) { return d.x; })
	            .attr("cy", function(d) { return d.y; });
		});
	}
	
	return me;
}());

NCI.prepareDataForForceGraph = function(communities){
    var graph = { "nodes":[], "links": []};
	
	var nodeIndex = function(ip){
		var val = -1;
		$.each(graph.nodes, function(index, node){
			if (node.name == ip)
			   val = index;
		});
		return val;
	};	
	
	$.each(communities, function(index, community){
		$.each(community.Endpoints, function(index2, endpoint){
			if (index2 < 30)
			graph.nodes.push({
				"name": endpoint,
				"group": index
			});
		});
		$.each(community.Interactions, function(index2, interacton){
			if (nodeIndex(interacton[1]) > 0 && nodeIndex(interacton[0]) > 0)
			graph.links.push({
				"source": nodeIndex(interacton[1]),
				"target": nodeIndex(interacton[0]),
				"value": 1});
		});
	});
	
	// //TODO optimaze calculations
	// $.each(graph.nodes, function(index, node){
	// 	var numOfConnections = 0;
	// 	$.each(graph.links, function(index, link){
	// 		if (link.source != -1 &&  link.target != -1)
	// 		if (graph.nodes[link.source].name == node.name || graph.nodes[link.target].name == node.name){
	// 			numOfConnections++;
	// 		}
	// 		if (link.source != -1 &&  link.target != -1)
	// 		if (graph.nodes[link.source].group != graph.nodes[link.target].group)
	// 		    node.hasExternalConnections = true;
	// 	});
	// 	node.neighbours = numOfConnections/2;
	// });	
	// 
	// graph.nodes.sort(function(node1, node2){
	// 	return node2.neighbours - node1.neighbours;
	// });
	
	// var nodes = [];
	// $.each(graph.nodes, function(index, node){
	// 	if (index < 50){
	// 		nodes.push(node);
	// 	}
	// });
	// graph.nodes = nodes;
	// 
	// graph.links = [];
	// 
	// $.each(communities, function(index, community){
	//     $.each(community.Interactions, function(index, interacton){
	// 	    var sIndex = nodeIndex(interacton[1]);
	// 	    var tIndex = nodeIndex(interacton[0]);
	// 	    if (sIndex >= 0 && tIndex >= 0){
	// 		    graph.links.push({
	// 			    "source": sIndex,
	// 			    "target": tIndex,
	// 			    "value": 1});
	// 	    }
	//     });
	//     });
	
	return graph;
};

// NCI.filterGraphInfo = function(graph){
// 	$.each(graph.nodes, function(index, node){
// 		//todo optimaze
// 		var numOfConnections = 0;
// 		$.each(graph.links, function(index, link){
// 			if (graph.nodes[link.source].name == node.name || graph.nodes[link.target].name == node.name){
// 				numOfConnections++;
// 			}
// 			if (graph.nodes[link.source].group != graph.nodes[link.target].group)
// 			    node.hasExternalConnections = true;
// 		});
// 		node.neighbours = numOfConnections;
// 	});	
// };