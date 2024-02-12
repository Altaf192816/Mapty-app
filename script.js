'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class WorkOut {
  date = new Date();
  id = String(Date.now()).slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance; //in Km
    this.duration = duration; //in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends WorkOut {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends WorkOut {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
//!Test data
// const run1 = new Running([39,-12],23,120,273);
// const cycl1 = new Cycling([39,-14],50,180,273);
// console.log(run1,cycl1);

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    //When new object is created code inside constrctor function excute
    //Get user position
    this._getPosition();

    //ClickEvent on form
    form.addEventListener('submit', this._newWorkout.bind(this));

    //Change Event on form
    inputType.addEventListener('change', this._toggleElevationFeild);

    //Click Event on workouts
    containerWorkouts.addEventListener('click', this._moveTOPopup.bind(this));

    //get local storage data
    this._getLocalStorage();
  }

  _moveTOPopup(e) {
    const workoutEL = e.target.closest('.workout');
    if (!workoutEL) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEL.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _getPosition() {
    if (navigator.geolocation) {
      //Checking navigator.geolocation exist.This will prevent from error
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Not able to get Your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //ClickEvent on map
    this.#map.on('click', this._showForm.bind(this));

    //Showing localStorage data on map
    this.#workouts.forEach(work => this._renderWorkOutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationFeild() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    //Get Data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    //If workout running Create a running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //Check if data is valid
      if (
        /*!Number.isFinite(distance) ||
         !Number.isFinite(duration) ||
        !Number.isFinite(cadence) ||
        distance < 0 ||
        duration < 0 ||
        cadence < 0*/
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input have to be Positive Number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If workout cycling Create a cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //Check if data is valid
      if (
        /*!Number.isFinite(distance) ||
        !Number.isFinite(duration) ||
        !Number.isFinite(elevation) ||
        distance < 0 ||
        duration < 0*/
        !validInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Input have to be Positive Number');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add a new object to WorkOut array
    this.#workouts.push(workout);

    //Render workout on map as marker
    this._renderWorkOutMarker(workout);

    //Render workout on list
    this._renderWorkout(workout);

    //hide Form and Clear input feild
    this._hideForm();

    //Set local storage to all workout
    this._setLocalStorage();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  removeLocalStorage() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _renderWorkOutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
       <span class="workout__icon">⚡️</span>
       <span class="workout__value">${workout.cadence}</span>
       <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
       <span class="workout__icon">🦶🏼</span>
       <span class="workout__value">${workout.pace.toFixed(1)}</span>
       <span class="workout__unit">spm</span>
      </div>
    </li>
    `;
    }
    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
       <span class="workout__icon">⚡️</span>
       <span class="workout__value">${workout.elevationGain}</span>
       <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
       <span class="workout__icon">⛰</span>
       <span class="workout__value">${workout.speed.toFixed(1)}</span>
       <span class="workout__unit">m</span>
      </div>
    </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _hideForm() {
    // prettier-ignore
    inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
}

const app = new App();
//! to remove workouts write in console--->app.removeLocalStorage();
