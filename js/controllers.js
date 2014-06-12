var app = angular.module('WSNApp', ['ngRoute', 'highcharts-ng']);

var baseurl = "http://localhost/wsn/interface/";

app.controller('MainCtrl', ['$scope', '$http', '$location', function($scope, $http, $location){
    $http.get(baseurl+"gatewaylist.json")
        .success(function(d){
            var data = d.root;
            if(data.flag == 'success') {
                $scope.gatewaylist = data.gatewaylist;
            }
        });
    var compareID = function(a, b) {
        if(a.id < b.id) {
            return -1;
        }else if(a.id > b.id) {
            return 1;
        }else{
            return 0;
        }
    }
    $scope.getGateway = function(gateway){
        $scope.gateway = gateway;
        var gwname = gateway.gwname;
        $http.get(baseurl+gwname+"/sensorlist.json")
            .success(function(d){
                var data = d.root;
                if(data.flag == 'success') {
                    $scope.sensorlist = data.sensorlist.sort(compareID);
                    $location.path("/realtime");
                }
            });
    };
}]);

app.controller('RealtimeCtrl', ['$scope', function($scope){
    $scope.gateway.selected = 'realtime';
}]);

app.controller('SensorCtrl', ['$scope', '$http', function($scope, $http){
    var sensor = $scope.sensor;
    var sensorname = sensor.nodename;
    if(!sensor.status) {
        return;
    }
    var formatData = function(data) {
        return Math.round(data*100)/100;
    }
    var fetchData = function(){
        $http.get(baseurl+sensorname+"/realtime.json")
            .success(function(d){
                var data = d.root;
                if(data.flag == 'success') {
                    var rdata = {};
                    data.realtimeData.datatype.forEach(function(item, index){
                        var t = data.realtimeData.datavalue[index];
                        if(item == "temperature") {
                            rdata.temperature = formatData(t);
                        }else if(item == "humidity") {
                            rdata.humidity = formatData(t);
                        }else if(item == "light") {
                            rdata.light = t;
                        }else {
                        }
                    });
                    $scope.sensor.data = rdata;
                }
            });
    };
    fetchData();
    setInterval(fetchData, 60000);
}]);

app.controller('HistoryCtrl', ['$scope', '$http', function($scope, $http){
    $scope.gateway.selected = 'history';
    var sensorlist = $scope.sensorlist;
    $scope.temperatureData = []; 
    $scope.humidityData = [];
    var compareTime = function(a, b) {
        if(a[0] < b[0]) {
            return -1;
        }else if(a[0] > b[0]) {
            return 1;
        }else{
            return 0;
        }
    }
    sensorlist.forEach(function(item){
        var now = new Date();
        var end = now.getFullYear()+"-"+(now.getMonth()+1)+"-"+now.getDate()+" "+now.getHours()+":"+now.getMinutes()+":"+now.getSeconds();
        var start = "1990-01-01 00:00:00";
        $http.get(baseurl+item.nodename+"/"+start+"/"+end+"/historydata.json")
            .success(function(data){
                var rows = data.rows;
                var temperatureData = [];
                var humidityData = [];
                rows.forEach(function(row){
                    var time = new Date(row.time).getTime() + 8*60*60*1000;
                    var temperature = Math.round(parseFloat(row.temperature)*100)/100;
                    var humidity = Math.round(parseFloat(row.humidity)*100)/100;
                    if(temperature < 1000 && humidity < 1000) {
                        temperatureData.push([time, temperature]);
                        humidityData.push([time, humidity]);
                    }
                });
                $scope.temperatureData.push({
                    data:temperatureData.sort(compareTime),
                    name:item.nodename,
                });
                $scope.humidityData.push({
                    data:humidityData.sort(compareTime),
                    name:item.nodename,
                });
            });

    });
}]);

app.controller('TemperatureCtrl', ['$scope', function($scope){
    $scope.temperatureConfig = {
        options: {
            tooltip: {
                valueSuffix: '℃',
            },
            legend: {
                layout: 'vetical',
                enabled: true,
                borderWidth: 0,
                align: 'left',
                verticalAlign: 'middle',
            },
        },
        series: $scope.temperatureData,
        title: {
            text: 'Temperature(℃)',
            x: -20,
        },
        useHighStocks: true,
    };
}]);

app.controller('HumidityCtrl', ['$scope', function($scope){
    $scope.humidityConfig = {
        options: {
            tooltip: {
                valueSuffix: '%',
            },
            legend: {
                layout: 'vetical',
                enabled: true,
                borderWidth: 0,
                align: 'left',
                verticalAlign: 'middle',
            },
         },
        series: $scope.humidityData,
        title: {
            text: 'Humidity(%)',
            x: -20,
        },
        useHighStocks: true,
        timezoneOffset: 8,
    };
}]);

app.controller('MapCtrl', ['$scope', function($scope){
    $scope.gateway.selected = 'map';
}]);

app.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider){
        $routeProvider
            .when('/realtime', {
                templateUrl: 'realtime.html',
                controller: 'RealtimeCtrl',
            })
            .when('/history', {
                templateUrl: 'history.html',
                controller: 'HistoryCtrl',
            })
            .when('/map', {
                templateUrl: 'map.html',
                controller: 'MapCtrl',
            });
    $locationProvider.hashPrefix("!");
}]);
