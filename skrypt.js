var cities;
var i;
var maxResults = 10;

let vh = window.innerHeight * 0.01;
document.documentElement.style.setProperty('--vh', `${vh}px`);

window.addEventListener('resize', () => {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
});

var citiesRequest = new XMLHttpRequest();
citiesRequest.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
        getCities(this.responseText);
    } else if (this.status > 299 && this.readyState == 4) {
        hideLoading();
        showError("Błąd połączenia z bazą miast!");
    }
};
citiesRequest.onerror = function () {
    hideLoading();
    showError("Błąd połączenia z bazą miast!")
};
checkStorage();

function checkStorage() {
    var theme = localStorage.getItem("theme");
    var cityName = localStorage.getItem("name");
    var lat = localStorage.getItem('lat');
    var lng = localStorage.getItem('lng');

    if (cityName == -1) {
        getLocation();
    } else if (cityName != null) {
        loadCity(lat, lng, cityName);
    } else {
        showWelcome()
    }

    if (theme == null || theme == 'Light') {
        document.documentElement.style.setProperty('--background', 'white');
        document.getElementById("themeButton").src = "Icons/Moon.svg";
    } else {
        document.documentElement.style.setProperty('--background', 'black');
        document.getElementById("themeButton").src = "Icons/Sun.svg";
    }
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(locationSuccess, locationFailure);
    } else {
        showError('Ta przeglądarka nie wspiera Geolokalizacji! Spróbuj ręcznie wpisać nazwę miejscowości.')
    }
}

function locationSuccess(position) {
    localStorage.setItem('name', -1);
    document.getElementById("cityName").innerHTML = "Aktualne miejsce";
    getWeather(position);
}

function locationFailure() {
    showReloading();
    showError('Nie można otrzymać lokalizacji! Sprawdź czy jest włączona funkcja lokalizacji lub spróbuj ręcznie wpisać nazwę miejscowości.');
}

function switchTheme() {
    if (document.documentElement.style.getPropertyValue('--background') == 'white') {
        document.getElementById("themeButton").src = "Icons/Sun.svg";
        document.documentElement.style.setProperty('--background', 'black');
        localStorage.setItem('theme', 'Dark');
    } else {
        document.getElementById("themeButton").src = "Icons/Moon.svg";
        document.documentElement.style.setProperty('--background', 'white');
        localStorage.setItem('theme', 'Light');
    }
}

function getCities(responseText) {
    cities = JSON.parse(responseText);
    cities.geonames = removeDuplicates(cities.geonames);
    document.getElementById("searchResults").innerHTML = '';
    i = 0;
    for (var city of cities.geonames) {
        if (city.adminName1 != "")
            document.getElementById("searchResults").innerHTML += `<div class="result" onclick="loadCity(${city.lat}, ${city.lng}, '${city.name}')"><img src="Icons/Place.svg"><p>${city.name}, ${city.adminName1}, ${city.countryCode}</p></div>`;
        else
            document.getElementById("searchResults").innerHTML += `<div class="result" onclick="loadCity(${city.lat}, ${city.lng}, '${city.name}')"><img src="Icons/Place.svg"><p>${city.name}, ${city.countryCode}</p></div>`;
        if (i == maxResults) {
            document.getElementById("searchResults").innerHTML += `<div class="result" id="loadMore" onclick="loadMore()">Wczytaj więcej...</div>`;
            break;
        }
        i++;
    }
    hideLoading();
}

function searchCity() {
    var text = document.getElementById("searchBar").value;
    if (text.length > 2) {
        showLoading();
        citiesRequest.abort();
        document.getElementById("searchResults").innerHTML = '';
        citiesRequest.open("GET", `https://secure.geonames.org/searchJSON?name_startsWith=${document.getElementById("searchBar").value}&style=LONG&maxRows=1000&orderby=population&username=przchodor`, true);
        citiesRequest.send();
    } else {
        document.getElementById("searchResults").innerHTML = '';
    }
}

function loadMore() {
    var deleteDiv = document.getElementById("loadMore");
    deleteDiv.remove();
    var text = document.getElementById("searchBar").value;
    for (let j = i + 1; j < cities.geonames.length; j++) {
        let city = cities.geonames[j];
        console.log(cities.geonames.length);
        if (city.adminName1 != "")
            document.getElementById("searchResults").innerHTML += `<div class="result" onclick="loadCity(${city.lat}, ${city.lng}, '${city.name}')"><img src="Icons/Place.svg"><p>${city.name}, ${city.adminName1}, ${city.countryCode}</p></div>`;
        else
            document.getElementById("searchResults").innerHTML += `<div class="result" onclick="loadCity(${city.lat}, ${city.lng}, '${city.name}')"><img src="Icons/Place.svg"><p>${city.name}, ${city.countryCode}</p></div>`;
        if (j == i + maxResults) {
            document.getElementById("searchResults").innerHTML += `<div class="result" id="loadMore" onclick="loadMore()">Wczytaj więcej...</div>`;
            i += maxResults;
            break;
        }
    }
}

function loadCity(lat, lng, name) {
    localStorage.setItem('name', name);
    document.getElementById("cityName").innerHTML = name;
    document.getElementById("searchResults").innerHTML = '';
    document.getElementById("searchBar").value = '';
    var position = {
        coords: {
            latitude: lat,
            longitude: lng
        }
    };
    getWeather(position);
}

function getWeather(position) {
    localStorage.setItem('lat', position.coords.latitude);
    localStorage.setItem('lng', position.coords.longitude);
    showLoading();
    var weatherRequest = new XMLHttpRequest();
    weatherRequest.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            loadWeather(this.responseText);
        } else if (this.status > 299 && this.readyState == 4) {
            hideLoading();
            showError("Błąd połączenia ze serwerem pogody! Spróbuj ponownie później.");
        }
    };
    weatherRequest.onerror = function () {
        hideLoading();
        showError("Błąd połączenia ze serwerem pogody! Spróbuj ponownie później.")
    };
    weatherRequest.open("GET", `https://api.openweathermap.org/data/2.5/onecall?lat=${position.coords.latitude}&lon=${position.coords.longitude}&exclude=minutely,hourly,alerts&units=metric&lang=pl&appid=a599189cf2973ef94f4f439e2f79b198`, true);
    weatherRequest.send();
}

function loadWeather(responseText) {
    var weather = JSON.parse(responseText);
    document.getElementById("welcome").style.display = "none";
    var sunrise = new Date((weather.current.sunrise + weather.timezone_offset) * 1000);
    var sunset = new Date((weather.current.sunset + weather.timezone_offset) * 1000);
    var userTimezoneOffset = sunrise.getTimezoneOffset() * 60000;
    sunrise = new Date(sunrise.getTime() + userTimezoneOffset);
    sunset = new Date(sunset.getTime() + userTimezoneOffset);
    document.getElementById("sunrise").innerHTML = `${(sunrise.getHours()<10 ? '0'  : '') + sunrise.getHours()}:${(sunrise.getMinutes()<10 ? '0'  : '') + sunrise.getMinutes()}`;
    document.getElementById("sunset").innerHTML = `${(sunset.getHours()<10 ? '0'  : '') + sunset.getHours()}:${(sunset.getMinutes()<10 ? '0'  : '') + sunset.getMinutes()}`;
    document.getElementById("currentTemp").innerHTML = Math.round(weather.current.temp) + "°C";
    document.getElementById("mainImage").onload = showWeather;
    document.getElementById("mainImage").src = `Icons/${weather.current.weather[0].icon}.svg`;
    document.getElementById("curTemp").innerHTML = Math.round(weather.current.feels_like) + "°C";
    document.getElementById("curHumi").innerHTML = weather.current.humidity + "%";
    document.getElementById("curUV").innerHTML = Math.round(weather.current.uvi);
    document.getElementById("curClou").innerHTML = weather.current.clouds + "%";
    document.getElementById("curPres").innerHTML = weather.current.pressure + " hPa";
    document.getElementById("curWind").innerHTML = weather.current.wind_speed + " m/s";
    var dates = document.getElementsByClassName("date");
    var icons = document.getElementsByClassName("weatherIcon");
    var temps = document.getElementsByClassName("temp");

    for (let index = 0; index < 5; index++) {
        var date = new Date((weather.daily[index + 1].dt + weather.timezone_offset) * 1000);
        dates[index].innerHTML = `${(date.getUTCDate()<10 ? '0'  : '') + date.getUTCDate()}.${(date.getUTCMonth() + 1 < 10 ? '0'  : '') + (date.getUTCMonth() + 1)}`;
        icons[index].src = `Icons/${weather.daily[index + 1].weather[0].icon}.svg`;
        temps[index].innerHTML = Math.round(weather.daily[index + 1].temp.day) + "°";
    }

}

function removeDuplicates(arr) {
    var uniques = [];
    arr.forEach(function (city1) {
        var unique = true;
        uniques.forEach(function (city2) {
            if (city1.name == city2.name && city1.adminName1 == city2.adminName1 && city1.countryCode == city2.countryCode)
                unique = false;
        });
        if (unique)
            uniques.push(city1);
    });
    return uniques;
}

function showReloading() {
    showLoading();
    setTimeout(hideLoading, 100);
}

function showLoading() {
    document.getElementById("loadingScreen").style.display = "initial";
    document.getElementById('loadingScreen').style.transition = "none";
    document.getElementById("loadingScreen").style.opacity = 1;
}

function hideLoading() {
    document.getElementById('loadingScreen').style.transition = "opacity 1s";
    document.getElementById("loadingScreen").style.opacity = 0;
    document.getElementById("loadingScreen").ontransitionend = function () {
        document.getElementById("loadingScreen").style.display = "none";
    };
}

function showWelcome() {
    hideLoading();
    var element = document.getElementById("welcome");
    element.style.display = "flex";
    document.getElementById("error").style.display = "none";
    document.getElementById("weather").style.display = "none";
    element.classList.remove("slide-in-anim");
    void element.offsetWidth;
    element.classList.add("slide-in-anim");
}

function showWeather() {
    hideLoading();
    var element = document.getElementById("weather");
    element.style.display = "flex";
    document.getElementById("error").style.display = "none";
    document.getElementById("welcome").style.display = "none";
    element.classList.remove("slide-in-anim");
    void element.offsetWidth;
    element.classList.add("slide-in-anim");
}

function showError(e) {
    var element = document.getElementById("error");
    element.style.display = "flex";
    document.getElementById("welcome").style.display = "none";
    document.getElementById("weather").style.display = "none";
    document.getElementById("errorMsg").innerHTML = e;
    element.classList.remove("slide-in-anim");
    void element.offsetWidth;
    element.classList.add("slide-in-anim");
}