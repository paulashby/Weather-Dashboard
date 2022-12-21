/*

TODO:
Font icons
geolocation on line 34
- we call updateWeatherData() in every instance

*/

$(document).ready(function () {

    var API_KEY = "5ea99b9314425a0dc64aac15b7e87095";
    var baseURL = "http://api.openweathermap.org/";
    var geoCodeSegment = "geo/1.0/direct";
    var geoCodeEnd = "&limit=1&appid=" + API_KEY;
    var forecastSegment = "data/2.5/forecast";
    var body = $("body");
    var interface = body.find("#interface");
    var todayElmt = interface.find("#today");
    var searchForm = interface.find("#search-form");
    var seachInput = searchForm.find("#search-input");
    var fiveDayForecastElmt = interface.find("#five-day-forecast");
    var historyElmt = interface.find("#history");
    var statusMessageElmt = interface.find("#message");
    var geolocated = false;

    showLoadingAlert();
    updateHistoryBtns();

    // Default to London
    var city = "London";
    var lat = 51.5073219;
    var lon = -0.1276474;

    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(function (position) {
            // City name will be set according to geolocation data
            geolocated = true;
            // Location acquired - update lat/lon and call with new values
            lat = position.coords.latitude;
            lon = position.coords.longitude;
            updateWeatherData();
        }, function () {
            // Error getting location - call with default values
            updateWeatherData();
        });
    } else {
        // Geolocation not available - call with default values
        updateWeatherData();
    }

    $(document).on('click', '.btn-history', handleHistoryClick);
    searchForm.on("submit", handleSearch);
    seachInput.on("focus", function () {
        $(this).val("");
    });

    function handleSearch(event) {

        event.preventDefault();

        city = $("input[id='search-input']").val().trim().toLowerCase();
        loadCityData();
    }

    function handleHistoryClick(event) {
        city = $(this).attr("data-city");
        loadCityData();
    }

    function loadCityData() {

        var geoQueryURL = baseURL + geoCodeSegment + "?q=" + city + geoCodeEnd;
        showLoadingAlert();

        // Get lat/lon based on city name
        $.ajax({
            url: geoQueryURL,
            method: "GET"
        })
            .then(function (response) {

                // Show error if no city returned
                if (!response.length) {
                    return showNoDataAlert();
                }
                // Get weather data using updated lat/lon
                lat = response[0].lat;
                lon = response[0].lon;
                updateWeatherData();

            });
    }

    // Remove results from previous calls
    function clearResults() {
        todayElmt.empty();
        fiveDayForecastElmt.empty();
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

        /*
        Extract required data. 
        API returns wind in m/sec, so need to convert to KPH:
        KPS = wind/1000
        KPH = KPS * 3600
        so in fact API wind value * 3.6
        */
        var conditions = {            
            temp: forecastData.main.temp + " &#8451;",
            humidity: forecastData.main.humidity + " &percnt;",
            wind: (forecastData.wind.speed * 3.6).toFixed(2) + " KPH"
        };
        // Extract keys to allow traversal of object
        var conditionKeys = Object.keys(conditions);

        // Create list element to store rendered HTML
        var conditionsList = $("<dl>");

        conditionKeys.forEach(function (value, i) {
            // Build entry for each key. Use html() for dd elements to convert HTML entities (degree/percent characters)
            conditionsList.append($("<dt>").text(value + ":"), $("<dd />").html(" " + conditions[value]));
        });

        return conditionsList;
    }

    function showNoDataAlert() {
        showAlert("No data available for " + city + ".");
    }

    function showLoadingAlert() {
        showAlert("Loading data...");
    }

    function showAlert(message) {
        statusMessageElmt.text(message);
        body.addClass("show-status");
    }

    function updateWeatherData() {

        var forecastURL = baseURL + forecastSegment + "?lat=" + lat + "&lon=" + lon + "&units=metric&appid=" + API_KEY;

        $.ajax({
            url: forecastURL,
            method: "GET"
        })
            .then(function (response) {

                // Remove "loading" message
                body.removeClass("show-status");

                clearResults();

                if (geolocated) {
                    // Update city for Geolocation-based calls
                    city = response.city.name;
                }

                // Store forecast data for convenience
                var forecasts = response.list;

                // Get time of first forecast
                var forecastTime = getHour(forecasts[0].dt);

                // Filter out all other forecast times
                var dailyForecasts = forecasts.filter(function (item) {
                    return getHour(item.dt) === forecastTime;
                });
                var numDays = dailyForecasts.length;

                if (!numDays) {
                    // No data available - show alert
                    return showNoDataAlert();
                } else if (!geolocated) {
                    // This is a user-initated search - add to history
                    updateHistory();
                }
                // Use search input for city name rather than value returned by API
                geolocated = false;

                for (var i = 0; i < numDays; i++) {
                    var currDay = dailyForecasts[i];
                    var conditionsList = formatConditions(currDay);
                    var date = formatDate(currDay.dt);
                    // Update DOM
                    var currDayTitle = $("<h4 class='card-title'>").text(date);
                    var currDayForecast = $("<div class='col-12 col-sm-6 col-md-4 col-xl mb-4'>")
                        .append($("<div class='card rounded-0 long-forecast-entry'>")
                            .append($("<div class='card-body pl-5 pt-4 p-sm-2 pl-lg-5 pt-lg-4 p-xl-2'>")
                                .append(currDayTitle, conditionsList)));

                    fiveDayForecastElmt.append(currDayForecast);

                    if (i === 0) {
                        // Populate today's forecast
                        var todayHead = $("<h2 class='col-12'>").text(city + "(" + date + ")");
                        // Clone conditionsList - simply appending moves the existing list from the 5 day forecast rather than making a copy
                        var conditionsToday = conditionsList.clone().addClass("col-12");
                        todayElmt.append(todayHead, conditionsToday);
                    }
                }
            });
    }

    function updateHistoryBtns() {

        historyElmt.empty();

        var history = JSON.parse(window.localStorage.getItem("history")) || [];

        for (var i = 0; i < history.length; i++) {
            var cityBtn = $("<button class='btn btn-secondary mb-2 btn-history' type='submit'>").attr("data-city", history[i]).text(history[i]);
            historyElmt.prepend(cityBtn);
        }
    }

    function updateHistory() {
        // Get existing history data
        var history = JSON.parse(window.localStorage.getItem("history")) || [];

        // Remove previous entry for this city so searches remain chronological
        history = history.filter(function (item) {
            return item !== city;
        });

        // Add latest search to updated History
        history.push(city);

        // Update in local storage
        window.localStorage.setItem("history", JSON.stringify(history));

        // Update DOM
        updateHistoryBtns();
    }
});