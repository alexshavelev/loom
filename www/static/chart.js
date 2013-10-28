if (typeof NCI === 'undefined')
   NCI = {};   

NCI.getChartHeight = function(){
   	var chartHeight = 	$( window ).height()/2;
       if ($( window ).width() < 400) 	{
   	  chartWidth = 4*$( window ).width()/5; 
   	  chartHeight = $( window ).height()/3;
       };
   	return chartHeight;
};

$('#visualization').height(NCI.getChartHeight());

NCI.chart = $.jqplot ('visualization', [[[0,0]]], {
    axesDefaults: {
       tickRenderer: $.jqplot.CanvasAxisTickRenderer ,
       tickOptions: {
          angle: -30,
          fontSize: '10pt',
		  showGridline: true
	   }
    },
	axes: {
	      xaxis: {
	        renderer: $.jqplot.CategoryAxisRenderer
	      },
		  yaxis: {
			  label:'NCI',
			  labelOptions:{
				  fontFamily:'Helvetica',
				  fontSize: '14pt'
			  }
		  }
	 },
	 seriesDefaults: {
	 	showMarker: false,
		color: "#205BBB",
		shadow: false,
		lineWidth: 1
	 },
	 grid :{
		 drawGridLines: false,
		 background: '#ffffff',  
		 drawBorder: false,
		 shadow: false
	 },
	 highlighter: {
		 show: true,
		 tooltipOffset: 4,
		 tooltipAxes: 'y'
	 }
});

NCI.chartData = [];

NCI.addValueToChart = function(params) {
	var newData = NCI.chartData;
	newData.push([params.time.toString(), params.NCI]);
    NCI.chart.series[0].data = newData;
	if (newData.length > 30)
		newData.shift();
	NCI.chart.resetAxesScale();
    NCI.chart.replot( {data: [newData]});
};
