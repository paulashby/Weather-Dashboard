$(document).ready(function () {

    var API_KEY = "5ea99b9314425a0dc64aac15b7e87095";
    var baseURL = "http://api.openweathermap.org/";
    var geoCodeSegment = "geo/1.0/direct";
    var geoCodeEnd = "&limit=1&appid=" + API_KEY;
    var forecastSegment = "data/2.5/forecast";
    var today = $("#today");
    var fiveDayForecast = $("#five-day-forecast");

    // Default to London
    var city = "London";
    var lat = 51.5073219;
    var lon = -0.1276474;
    
    updateWeatherData(lat, lon);

    $("#search-form").on("submit", handleSearch);

    function handleSearch(event) {

        event.preventDefault();

        city = $("input[id='search-input']").val();

        if (city) {
            var geoQueryURL = baseURL + geoCodeSegment + "?q=" + city + geoCodeEnd;

            $.ajax({
                url: geoQueryURL,
                method: "GET"
            })
                .then(function (response) {

                    // Show error if no city returned
                    if (!response.length) {
                        return showNoDataAlert(city);
                    }

                    var lat = response[0].lat;
                    var lon = response[0].lon;
                    updateWeatherData(lat, lon);

                });
        }
    }

    // Remove results from previous calls
    function clearResults() {
        today.empty();
        fiveDayForecast.empty();
    }

    // Return int corresponding to hour on 24 hour clock of given timestamp
    function getHour(timestamp) {
        return parseInt(moment.unix(timestamp).format('k'), 10);
    }

    // Return date string from given timestamp
    function formatDate(timestamp) {
        return moment.unix(timestamp).format("D/M/YYYY");
    }

    // Return HTML definition list from given forecast data (representing a single time period)
    function formatConditions(forecastData) {

        // Extract required data
        var conditions = {
            humidity: forecastData.main.humidity,
            temp: forecastData.main.temp,
            wind: forecastData.wind.speed
        };

        // Extract keys to allow traversal of object
        var conditionKeys = Object.keys(conditions);

        // Create list element to store rendered HTML
        var conditionsList = $("<dl>");

        conditionKeys.forEach(function (value, i) {
            // Build entry for each key
            conditionsList.append($("<dt>").text(value + ":"), $("<dd>").text(conditions[value]));
        });

        return conditionsList;
    }

    function showNoDataAlert(city) {
        fiveDayForecast.html("<div class='col-12'><div class='alert alert-danger' role='alert'>No data available for " + city + ".</div></div>");
    }

    function updateWeatherData(lat, lon) {

        var forecastURL = baseURL + forecastSegment + "?lat=" + lat + "&lon=" + lon + "&appid=" + API_KEY;

        $.ajax({
            url: forecastURL,
            method: "GET"
        })
            .then(function (response) {

                clearResults();

                var forecasts = response.list;
                // Store time of first forecast
                var forecastTime = getHour(forecasts[0].dt);

                // Filter out all other forecast times
                var dailyForecasts = forecasts.filter(function (item) {
                    return getHour(item.dt) === forecastTime;
                });
                var numDays = dailyForecasts.length;

                if (!numDays) {
                    // No data available - show alert
                    return showNoDataAlert(city);

                }

                for (var i = 0; i < numDays; i++) {
                    // Populate forecast for today - ONLY FOR FIRST ENTRY!
                    var currDay = dailyForecasts[i];
                    var conditionsList = formatConditions(currDay);
                    var date = formatDate(currDay.dt);

                    var currDayTitle = $("<h4 class='card-title'>").text(date);
                    var currDayForecast = $("<div class='col-12 col-sm-6 col-md-4 col-xl mb-4'>")
                        .append($("<div class='card rounded-0 long-forecast-entry'>")
                            .append($("<div class='card-body pl-5 pt-4 p-sm-2 pl-lg-5 pt-lg-4 p-xl-2'>")
                                .append(currDayTitle, conditionsList)));

                    fiveDayForecast.append(currDayForecast);

                    if (i === 0) {
                        // Populate today's forecast
                        var todayHead = $("<h2 class='col-12'>").text(city + "(" + date + ")");
                        // Clone conditionsList - simply appending moves the existing list from the 5 day forecast rather than making a copy
                        var conditionsToday = conditionsList.clone().addClass("col-12");
                        today.append(todayHead, conditionsToday);
                    }
                }
            });
    }
});