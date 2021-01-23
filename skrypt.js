var cities;                                         //Lista miast
var currentResults;                                 //Ilość obecnie wyświetlonych miast
var maxResults = 10;                                //Ilość wyświetlanych jednorazowo nazw miast
var lastAvailHeight = window.screen.availHeight;    //Ostatnia wysokość ekranu
var hideLoadingTimeout;                             //Przerwa do zankończenia animacji ukrywania wczytywania

//Ustalenie vh ignorującego pasek URL przeglądarki mobilnej
let vh = window.innerHeight * 0.01;
document.documentElement.style.setProperty('--vh', `${vh}px`);

window.addEventListener('resize', () => {
    //Spawdzenie czy może być wysunięta klawiatura na urządzeniu mobilnym i czy nie zmieniono jego orientacji
    if (document.activeElement !== document.getElementById("searchBar") || lastAvailHeight != window.screen.availHeight || !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        //Jeśli zmieniono orientację ekranu
        if (lastAvailHeight != window.screen.availHeight)
            hideKeyboard();

        //Ustalenie vh ignorującego pasek URL przeglądarki mobilnej
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);

        lastAvailHeight = window.screen.availHeight;
        setCellSize();
    }
});

var citiesRequest = new XMLHttpRequest();
citiesRequest.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
        getCities(this.responseText);
    } else if (this.status > 299 && this.readyState == 4) {
        hideLoading();
        showError("Błąd połączenia z bazą miast! Spróbuj ponownie później.");
    }
};
citiesRequest.onerror = function () {
    hideLoading();
    showError("Błąd połączenia z bazą miast! Spróbuj ponownie później.")
};

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

setCellSize();
document.getElementById("themeSelection").style.display = "none";
checkStorage();

function checkStorage() {
    var cityName = localStorage.getItem("name");
    var lat = localStorage.getItem('lat');
    var lng = localStorage.getItem('lng');

    //Sprawdzenie czy ostatnio użyto lokalizacji
    if (cityName == -1) {
        getLocation();
    } else if (cityName != null) {
        loadCity(lat, lng, cityName);
    } else {
        showWelcome();
    }

    var foreground = localStorage.getItem("foreground");
    var background = localStorage.getItem("background");

    if (foreground != null && background != null) {
        document.documentElement.style.setProperty('--foreground', foreground);
        document.documentElement.style.setProperty('--background', background);
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
    document.getElementById("cityName").innerHTML = "Lokalnie";
    document.title = "Pogoda Lokalna";
    getWeather(position);
}

function locationFailure() {
    showReloading();
    showError('Nie można otrzymać lokalizacji! Sprawdź czy jest włączona funkcja lokalizacji lub spróbuj ręcznie wpisać nazwę miejscowości.');
}


function getCities(responseText) {
    cities = JSON.parse(responseText);
    cities.geonames = removeDuplicates(cities.geonames); 
    //Wyczyszczenie listy wyników
    document.getElementById("searchResults").innerHTML = '';
    currentResults = 0;
    for (var city of cities.geonames) {
        if (city.adminName1 != "")
            document.getElementById("searchResults").innerHTML += `<div class="result" onclick="loadCity(${city.lat}, ${city.lng}, '${city.name.replace("'","\\'")}')"><svg class="icon"><use xlink:href="icons.svg#icon-Place"></use></svg><p>${city.name}, ${city.adminName1}, ${city.countryCode}</p></div>`;
        else
            document.getElementById("searchResults").innerHTML += `<div class="result" onclick="loadCity(${city.lat}, ${city.lng}, '${city.name.replace("'","\\'")}')"><svg class="icon"><use xlink:href="icons.svg#icon-Place"></use></svg><p>${city.name}, ${city.countryCode}</p></div>`;
        
        //Jeśli wyników jest więcej niż 10 to dodaj przycisk do wczytania kolejnych 10
        if (currentResults == maxResults) {
            document.getElementById("searchResults").innerHTML += `<div class="result" id="loadMore" onclick="loadMore()">Wczytaj więcej...</div>`;
            break;
        }
        currentResults++;
    }
    hideLoading();
}

function searchCity(event) {
    if (event.key === "Enter") {
        hideKeyboard();
        return;
    }
    //Jeśli zmieniono nazwę do wyszukania anuluj poprzednie wyszukiwanie
    citiesRequest.abort();
    var text = document.getElementById("searchBar").value;
    if (text.length > 2) {
        showLoading();
        //Wyczyszczenie listy wyników
        document.getElementById("searchResults").innerHTML = '';
        citiesRequest.open("GET", `https://secure.geonames.org/searchJSON?name_startsWith=${document.getElementById("searchBar").value}&style=LONG&maxRows=1000&orderby=population&username=przchodor`, true);
        citiesRequest.send();
    } else {
        //Nie wyświetlaj wyników dla nazw krótszych od 3 znaków
        document.getElementById("loadingScreen").style.display = "none";
        document.getElementById("searchResults").innerHTML = '';
    }
}

function loadMore() {
    //Usuń przycisk do wczytania kolejnych nazw z listy
    var deleteDiv = document.getElementById("loadMore");
    deleteDiv.remove();

    var text = document.getElementById("searchBar").value;

    //Wyświetl 10 kolejnych nazw
    for (let i = currentResults + 1; i < cities.geonames.length; i++) {
        let city = cities.geonames[i];
        if (city.adminName1 != "")
            document.getElementById("searchResults").innerHTML += `<div class="result" onclick="loadCity(${city.lat}, ${city.lng}, '${city.name.replace("'","\\'")}')"><svg class="icon"><use xlink:href="icons.svg#icon-Place"></use></svg><p>${city.name}, ${city.adminName1}, ${city.countryCode}</p></div>`;
        else
            document.getElementById("searchResults").innerHTML += `<div class="result" onclick="loadCity(${city.lat}, ${city.lng}, '${city.name.replace("'","\\'")}')"><svg class="icon"><use xlink:href="icons.svg#icon-Place"></use></svg><p>${city.name}, ${city.countryCode}</p></div>`;
        
        //Jeśli nadal istnieją niewyświetlone wyniki to dodaj przycisk do wczytania kolejnych 10
        if (i == currentResults + maxResults) {
            document.getElementById("searchResults").innerHTML += `<div class="result" id="loadMore" onclick="loadMore()">Wczytaj więcej...</div>`;
            currentResults += maxResults;
            break;
        }
    }
}

function loadCity(lat, lng, name) {
    localStorage.setItem('name', name);
    document.getElementById("cityName").innerHTML = name;
    document.title = "Pogoda " + name;
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
    weatherRequest.abort();
    weatherRequest.open("GET", `https://api.openweathermap.org/data/2.5/onecall?lat=${position.coords.latitude}&lon=${position.coords.longitude}&exclude=minutely,hourly,alerts&units=metric&lang=pl&appid=a599189cf2973ef94f4f439e2f79b198`, true);
    weatherRequest.send();
}

function loadWeather(responseText) {
    var weather = JSON.parse(responseText);
    //Przetworzenie czasu na poprawny dla danego miejsca
    var sunrise = new Date((weather.current.sunrise + weather.timezone_offset) * 1000);
    var sunset = new Date((weather.current.sunset + weather.timezone_offset) * 1000);
    var userTimezoneOffset = sunrise.getTimezoneOffset() * 60000;
    sunrise = new Date(sunrise.getTime() + userTimezoneOffset);
    sunset = new Date(sunset.getTime() + userTimezoneOffset);
    //Wypisanie otrzymanych danych na ekran
    document.getElementById("sunrise").innerHTML = `${(sunrise.getHours()<10 ? '0'  : '') + sunrise.getHours()}:${(sunrise.getMinutes()<10 ? '0'  : '') + sunrise.getMinutes()}`;
    document.getElementById("sunset").innerHTML = `${(sunset.getHours()<10 ? '0'  : '') + sunset.getHours()}:${(sunset.getMinutes()<10 ? '0'  : '') + sunset.getMinutes()}`;
    document.getElementById("currentTemp").innerHTML = Math.round(weather.current.temp) + "°C";
    document.getElementById("mainImage").innerHTML = `<use xlink:href="icons.svg#icon-${weather.current.weather[0].icon}"></use>`;
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
        icons[index].innerHTML = `<use xlink:href="icons.svg#icon-${weather.daily[index + 1].weather[0].icon}"></use>`;
        temps[index].innerHTML = Math.round(weather.daily[index + 1].temp.day) + "°";
    }

    showWeather();
}

//Usuwanie identycznych nazw z listy
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

//Sztuczne spowolnienie ukrywania wczytywania
function showReloading() {
    showLoading();
    setTimeout(hideLoading, 100);
}

function showLoading() {
    document.getElementById("loadingScreen").style.display = "initial";
    //Usunięcie animacji
    document.getElementById('loadingScreen').style.transition = "none";
    document.getElementById("loadingScreen").style.opacity = 1;
}

function hideLoading() {
    //Zapobiegnięcie odmierzaniu wielu przerw jednocześnie
    clearTimeout(hideLoadingTimeout);
    document.getElementById("loadingScreen").style.opacity = 1;
    //Dodanie animacji
    document.getElementById('loadingScreen').style.transition = "opacity 1s";
    document.getElementById("loadingScreen").style.opacity = 0;
    hideLoadingTimeout = setTimeout(function () {
        document.getElementById("loadingScreen").style.display = "none";
    }, 1000);
}

function showWelcome() {
    hideLoading();
    var element = document.getElementById("welcome");
    element.style.display = "flex";
    document.getElementById("error").style.display = "none";
    document.getElementById("weather").style.display = "none";
    document.title = "Aplikacja Pogodowa"
    //Odtworzenie animacji
    element.classList.remove("slide-in-anim");
    void element.offsetWidth;
    element.classList.add("slide-in-anim");
}

function showWeather() {
    var element = document.getElementById("weather");
    element.style.display = "flex";
    document.getElementById("error").style.display = "none";
    document.getElementById("welcome").style.display = "none";
    //Odtworzenie animacji
    element.classList.remove("slide-in-anim");
    void element.offsetWidth;
    element.classList.add("slide-in-anim");
    hideLoading();
}

function showError(e) {
    var element = document.getElementById("error");
    element.style.display = "flex";
    document.getElementById("welcome").style.display = "none";
    document.getElementById("weather").style.display = "none";
    document.getElementById("errorMsg").innerHTML = e;
    document.title = "Błąd - Aplikacja Pogodowa"
    //Odtworzenie animacji
    element.classList.remove("slide-in-anim");
    void element.offsetWidth;
    element.classList.add("slide-in-anim");
}

function showThemeSelection() {
    var element = document.getElementById("themeSelection");
    element.style.display = "grid";
    //Odtworzenie animacji wejścia
    element.classList.remove("slide-in-anim");
    void element.offsetWidth;
    element.classList.add("slide-in-anim");
    setTimeout(function () {
        element.classList.remove("slide-in-anim");
    }, 1000);
}

function hideThemeSelection() {
    var element = document.getElementById("themeSelection");
    //Odtworzenie animacji wyjścia
    element.classList.remove("slide-out-top");
    void element.offsetWidth;
    element.classList.add("slide-out-top");
    setTimeout(function () {
        element.style.display = "none";
        element.classList.remove("slide-out-top");
    }, 500);
}

//Zmiana motywu aplikacji
function changeTheme(foreground, background) {
    document.documentElement.style.setProperty('--foreground', foreground);
    document.documentElement.style.setProperty('--background', background);
    localStorage.setItem('foreground', foreground);
    localStorage.setItem('background', background);
    hideThemeSelection();
}

//Ustalenie wielkości komórki w siatce motywów
function setCellSize() {
    var elementSize = 0;
    if (window.innerHeight > window.innerWidth)
        //Orientacja pionowa
        elementSize = Math.min(0.135 * window.innerHeight, 0.29 * window.innerWidth);
    else
        //Orientacja pozioma
        elementSize = Math.min(0.29 * window.innerHeight, 0.135 * window.innerWidth);

    var themeSelectorCells = document.getElementById("themeSelection").children;
    //Zastosowanie wielkości dla każdej komórki
    for (let index = 0; index < themeSelectorCells.length; index++) {
        const element = themeSelectorCells[index];
        element.style.height = elementSize + "px";
        element.style.width = elementSize + "px";
        element.style.fontSize = 0.6 * elementSize + "px";
    }
}

function hideKeyboard() {
    document.activeElement.blur();
}