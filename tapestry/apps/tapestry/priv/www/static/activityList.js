(function() {

    function createTable(columns, d3Selection, data) {
        var container = d3Selection
                .append("div")
                .classed("fixed-table-container", true)
                .classed("columns", true),
            background = container
                .append("div")
                .classed("header-background", true),
            table = container
                .append("div").classed("fixed-table-container-inner", true)
                .append("table"),

            thead = table.append("thead"),
            tbody = table.append("tbody");

        thead.append("tr");

        updateTable(table, columns, data);

        return container;
    }

    function sortActivities(activities, column, direction) {
        return activities.sort(function(a1, a2) {
            var sort = 0;
            if (a1[column] < a2[column]) {
                sort = -1;
            }
            if (a1[column] > a2[column]) {
                sort = 1;
            }
            return sort*direction;
        })
    }

    function filterActivities(activities, column, filter) {
        var re = stringToRegex(filter);

        return activities.filter(function(d) {
            return re.test(d[column]);
        });
    }

    function updateTable(table, columns, data) {
        var thead = table.select("thead"),
            tbody = table.select("tbody"),
            currentData = data;

        columns.forEach(function(column) {
            if (column.filter) {
                currentData = filterActivities(currentData, column.property, column.filter);
            }
        });

        columns.forEach(function(column) {
            if (column.sort) {
                currentData = sortActivities(currentData, column.property, column.sort);
            }
        });

        updateTableHeader(columns, thead);
        updateTableBody(columns, tbody, currentData);
    }

    function updateTableHeader(columns, thead) {
        var th = thead.select("tr")
            .selectAll("th")
            .data(columns),

            thEnter = th.enter()
                .append("th");

        thEnter.append("span")
            .classed("th-container", true)
            .text(function(column) { return column.text; });

        thEnter.append("div")
            .classed("th-inner", true)
            .text(function(column) { return column.text; });

        th.selectAll(".th-inner")
            .classed("sorted", function(d) {
                return d.sort;
            })
            .classed("desc", function(d) {
                return d.sort === DESC_DIRECTION;
            });
    }

    function updateTableBody(columns, tbody, data) {
        var rows = tbody.selectAll("tr")
            .data(data, function(d) {return d.endpoint});


        var cells = rows.enter()
            .append("tr")
            .selectAll("td")
            .data(function(row) {
                return columns.map(function (column) {
                    var renderer = column.renderer || defaultRenderer;

                    return {column: column, value: renderer(row[column.property])};
                })
            });

        cells.enter()
            .append("td")
            .html(function(d) {return d.value});

        rows.exit()
            .remove();

        rows.order();
    }

    function downloadFile(fileType, fileContent, fileName) {
        $("<a>")
            .attr("href", encodeURI(fileType + fileContent))
            .attr("download", fileName)
            .get(0)
            .click();
    }

    function createCSV(columns, data) {
        var csvRows = [columns.map(function(item) {
                return ['"',
                        item.text.replace('"', '""'),
                        '"'].join("");
            }).join(",")];

        csvRows = csvRows.concat(data.map(function(item) {
            return columns.map(function(column) {
                return item[column.property];
            }).join(",");
        }));

        return csvRows.join("\n");
    }

    function parseActivity(activity, index) {
        function isOutside(endpoint) {
            return activity.Endpoints.indexOf(endpoint) < 0;
        }

        function createEndpoint(endpoint) {
            return {
                activity: index + 1,
                endpoint: endpoint,
                internalConnections: 0,
                externalConnections: 0,
                totalConnections: 0,
                outsideConnections: 0,
                external: NCI.isExternal(endpoint)
            }
        }

        function getEndpoint(endpoint) {
            return endpoints[endpoint];
        }

        var endpoints = {};

        activity.Endpoints.forEach(function(endpoint) {
            endpoints[endpoint] = createEndpoint(endpoint);
        });

        activity.Interactions.forEach(
            function(interaction) {
                var endpointA = interaction[0],
                    endpointB = interaction[1];

                function updateInteractionConnections(epA, epB) {
                    var endpoint = getEndpoint(epA),
                        outside = isOutside(epB),
                        external = NCI.isExternal(epB);

                    if (endpoint) {
                        if (outside) {
                            endpoint.outsideConnections += 1;
                        }
                        endpoint[external ? "externalConnections" : "internalConnections"] += 1;
                        endpoint.totalConnections += 1;
                    }
                }

                updateInteractionConnections(endpointA, endpointB);
                updateInteractionConnections(endpointB, endpointA);
            }
        );

        return Object.keys(endpoints).map(function(endpoint) {return endpoints[endpoint]});
    }

    function parseActivities(activities) {
        return Array.prototype.concat.apply([], activities.map(parseActivity));
    }

    function getCommunitiesColumns(communities) {
        return communities.length > 1 ? createActivitiesColumns() : createActivityColumns();
    }

    function getActivityName(communities) {
        return communities.length > 1 ? "activities" : (communities[0].Label);
    }

    function stringToRegex(str) {
        // converts string with wildcards to regex
        // * - zero or more
        // ? - exact one

        str = str.replace(/\./g, "\\.");
        str = str.replace(/\?/g, ".");
        str = str.replace(/\*/g, ".*");

        return new RegExp(str, "g");
    }

    function defaultRenderer(value) {
        return value;
    }

    function createActivityColumns() {
        return [
            {text: "Endpoint", property: "endpoint", sort: null, filter: null},
            {text: "Internal", property: "internalConnections"},
            {text: "External", property: "externalConnections"},
            {text: "Total", property: "totalConnections", sort: DESC_DIRECTION, filter: null},
            {text: "Outside Connections", property: "outsideConnections", sort: null, filter: null},
//            {text: "External", property: "external", sort: null, filter: null}
        ];
    }

    function createActivitiesColumns() {
        return [
            {text: "Endpoint", property: "endpoint", sort: null, filter: null},
            {text: "Internal", property: "internalConnections"},
            {text: "External", property: "externalConnections"},
            {text: "Total", property: "totalConnections", sort: DESC_DIRECTION, filter: null},

//            {text: "External", property: "external", sort: null},
            {text: "Activity", property: "activity", sort: null,
                filter: null, renderer: function(value) {return "Activity #" + value}},
            {text: "Outside Connections", property: "outsideConnections", sort: null, filter: null}
        ]
    }

    function handleHeaderClick(listBuilder) {
        return function(data) {
            var $el = $(this),
                field = data.property,
                direction = $el.hasClass("desc") ? ASC_DIRECTION : DESC_DIRECTION;

            listBuilder.sortTable(field, direction);
        }
    }

    function ListBuilder(communities) {
        this.columns = getCommunitiesColumns(communities);
        this.activityName = getActivityName(communities);
        this.activities = sortActivities(parseActivities(communities));
        this.container = null;
    }

    var ASC_DIRECTION = 1,
        DESC_DIRECTION = -1,
        downloadCSV = downloadFile.bind(null, "data:text/csv;charset=utf-8,");

    ListBuilder.prototype.downloadCSV = function() {
        var columns = this.columns,
            csvName = this.activityName + ".csv",
            activities = this.activities,
            csvContent = createCSV(columns, activities);

        return downloadCSV(csvContent, csvName);
    };

    ListBuilder.prototype.createTable = function(d3Selection) {
        var columns = this.columns,
            activities = this.activities,
            container = createTable(columns, d3Selection, activities);

        container.selectAll(".th-inner").on("click", handleHeaderClick(this));

        this.container = container;

        return this.container;
    };

    ListBuilder.prototype.removeTable = function() {
        if (this.container) {
            this.container.on(".click");
            this.container.remove();
        }
        this.container = null;
    };

    ListBuilder.prototype.getTable = function() {
        return this.container.select("table");
    };

    ListBuilder.prototype.sortTable = function(field, direction) {
        var table = this.getTable();

        this.columns.forEach(function(column) {
            column.sort = null;
            if (column.property === field) {
                column.sort = direction;
            }
        });

        updateTable(table, this.columns, this.activities);
    };

    ListBuilder.prototype.filterTable = function(filterTerm) {
        var table = this.getTable();

        this.columns.forEach(function(column) {
            column.filter = null;
            if (column.property === "endpoint") {
                column.filter = filterTerm;
            }
        });

        updateTable(table, this.columns, this.activities);
    };

    NCI.list = {
        createListBuilder: function(communities) {
            return new ListBuilder(communities);
        }
    };

})();