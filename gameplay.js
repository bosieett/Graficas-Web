import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CharacterControls } from './CharacterControl.js';

//Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    FacebookAuthProvider
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    onValue,
    set,
    get
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {

    apiKey: "AIzaSyAu7KPLa2vQ_HDXEC25WCXh-A4a4gZVS4A",
  
    authDomain: "piagraficasweb-5905f.firebaseapp.com",
  
    projectId: "piagraficasweb-5905f",
  
    storageBucket: "piagraficasweb-5905f.appspot.com",
  
    messagingSenderId: "82150438327",
  
    appId: "1:82150438327:web:2750244f471b1c55bb6432"
  
  };

document.getElementById('btnReiniciarJuego').addEventListener('click', function() {
    location.reload();
})
  
  
//Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
auth.languageCode = 'es';
const provider = new GoogleAuthProvider();
const providerFB = new FacebookAuthProvider();

const db = getDatabase();

let currentUser;
let timerCounter = 7200;




let currentRoom = 0

const gameMode = getParameterByName('GameMode');
console.log(gameMode);

var mapa = getParameterByName('Mapa');
var dif = getParameterByName('Dificultad');

//Crear objeto usuario local
const statsPlayer = {
    uid : localStorage.getItem('currentPlayer'),
    name : localStorage.getItem('currentPlayerName'),
    pts : 0,
    inventory : {
        items : [],
        dishes: []
    },
    position : {
        x : 0,
        z : 0
    } 
}

async function login() {
    await signInWithPopup(auth, provider)
        .then((result) => {
            console.log(result);
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;

            // The signed-in user info.
            currentUser = result.user;

            localStorage.setItem('currentPlayer', currentUser.uid)
            localStorage.setItem('currentPlayerName', currentUser.displayName)

            statsPlayer.uid = currentUser.uid
            statsPlayer.name = currentUser.displayName
            statsPlayer.pts = 0
            statsPlayer.inventory = { items : [], dishes : []}

            printStats()
            location.href = location.href;

        }).catch((error) => {
            console.log(error);
            // ...
        });
}

async function loginFB() {
    await signInWithPopup(auth, providerFB)
        .then((result) => {
            console.log(result);
            const credentialFB = FacebookAuthProvider.credentialFromResult(result);
            const tokenFB = credentialFB.accessToken;
            // The signed-in user info.
            currentUser = result.user;
            
            localStorage.setItem('currentPlayer', currentUser.uid)
            localStorage.setItem('currentPlayerName', currentUser.displayName)

            statsPlayer.uid = currentUser.uid
            statsPlayer.name = currentUser.displayName
            statsPlayer.pts = 0
            statsPlayer.inventory = { items : [], dishes : []}

            printStats()
            location.href = location.href;
        }).catch((error) => {
            console.log(error);
        });
}

const currentPlayer = localStorage.getItem('currentPlayer');
const currentPlayerName = localStorage.getItem('currentPlayerName');
const buttonLogin = document.getElementById('button-login');
const buttonLogout = document.getElementById('button-logout');
const buttonLoginFB = document.getElementById('button-loginFB');
if(buttonLogin != null && buttonLogout != null && buttonLoginFB != null) {
    buttonLogin.addEventListener('click',async()=> {
        await login();
    })
    buttonLoginFB.addEventListener('click',async()=> {
        await loginFB();
    })
    buttonLogout.addEventListener('click',async()=> {
        await signOut(auth).then(() => {
            console.log('Sign-out succesful.');
          }).catch((error) => {
            console.log('An error happened.')
          });
    })
}

//GENERAR NUMERO DE SALA
document.getElementById('button-createRoom').addEventListener('click', async function() {

    let newRoomId = await generateRandomCodeRoom()

    set(ref(db, 'room/' + newRoomId), {
        creationDate: new Date(),
        difficult: dif,
        host_id: statsPlayer.uid,
        host_name: statsPlayer.name,
        room_code: newRoomId,
        map: mapa,
        status: "on waiting",
        timer: 7200
    });
    set(ref(db, 'roomPlayers/' + newRoomId + '/' + statsPlayer.uid), {
        pts: 0,
        status: "conectado",
        user_name: statsPlayer.name,
        position: {
            x: 5,
            z: 0
        }
    });

    currentRoom = newRoomId

    let roomGeneration = window.confirm('Invita a tus amigos con la siguiente clave de sala: ' + newRoomId);

    if (roomGeneration) {
        spawnPlayerModel()
        animate()
    } 
    else {
        console.log('El usuario canceló.');
    }
})

document.getElementById('button-joinRoom').addEventListener('click', function() {

    let roomPrompt = prompt('Introduce la clave de la sala')
    
    const roomRef = ref(db, 'room');

    get(roomRef)
    .then((snapshot) => {
        const roomValue = snapshot.val();

        const roomExists = Object.keys(roomValue).find(key => roomValue[key].room_code === parseInt(roomPrompt) && roomValue[key].timer > 0 && roomValue[key].map === indexMapa);

        if(roomExists) {
            currentRoom = roomExists

            set(ref(db, 'roomPlayers/' + currentRoom + '/' + statsPlayer.uid), {
                pts: 0,
                status: "conectado",
                user_name: statsPlayer.name,
                position: {
                    x: 5,
                    z: 0
                }
            });  
    
            spawnPlayerModel()
            animate()
    
            alert('Haz entrado a la sala con exito!')
        }
        else {
            alert('ERROR AL ENTRAR A LA SALA. Es probable que la sala no exista o su partida haya terminado, verifica que estas en el mismo mapa que la sala a la que quieres entrar')
        }
    })
    .catch((error) => {
        console.error('Error al obtener el valor del temporizador:', error);
        throw error;
    });

})

function generateRandomCodeRoom() {
    // Generar un número aleatorio entre 10000 y 99999
    const code = Math.floor(Math.random() * 90000) + 10000;
    return code;
}

/*
const buttonLoginFB = document.querySelector('#button-loginFB');
buttonLoginFB.addEventListener('click', e => {
    e.preventDefault();
    signInWithPopup(auth, providerFB)
        .then(result => {
            console.log(result);
            console.log('facebook signIn')
        }).catch(error => {
            console.log(error);
        });
})
*/

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

var indexMapa = mapa;

//Esenciales
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.x=0;
camera.position.y=40;
camera.position.z=30;
let light = new THREE.DirectionalLight(0xffffff, 0.5);
scene.add(light);
let light2 = new THREE.AmbientLight(0xd58cff);
scene.add(light2);
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.getElementById('gameplay-container').appendChild( renderer.domElement );

const cubeGeometry = new THREE.BoxGeometry(70, 3, 2);
const cubeGeometry2 = new THREE.BoxGeometry(2, 3, 70);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff1000 });
const downCollision = new THREE.Mesh(cubeGeometry, cubeMaterial)
downCollision.position.z=19
const upCollision = new THREE.Mesh(cubeGeometry, cubeMaterial)
upCollision.position.z=-37
const leftCollision = new THREE.Mesh(cubeGeometry2, cubeMaterial)
leftCollision.position.x=-31
const rightCollision = new THREE.Mesh(cubeGeometry2, cubeMaterial)
rightCollision.position.x=31

const plates = {
    "position": {
        1: {"x": -10, "z": -1},
        2: {"x": -16, "z": -30},
        3: {"x": 25, "z": -10}
    }
}

const trash = {
    "position": {
        1: {"x": 10, "z": -16},
        2: {"x": 16, "z": -30},
        3: {"x": 10, "z": -27}
    }
}

const ingredients = [
    {
        "name": "Arroz",
        "position": {
            1: {"x": 6, "z": -4},
            2: {"x": 7, "z": -30},
            3: {"x": 14, "z": 2},
        },
        "boundingBox": ""
    },
    {
        "name": "Algas",
        "position":  {
            1: {"x": 2, "z": -18},
            2: {"x": -8, "z": -30},
            3: {"x": 14, "z": -10}
        },
        "boundingBox": ""

    },
    {
        "name": "Salmon",
        "position": {
            1: {"x": -9, "z": -20},
            2: {"x": 0, "z": -18},
            3: {"x": 11, "z": 16}
        },
        "boundingBox": ""
    }
]

const dishes = [
    {
        "name": "Plato del jugador",
        "ingredients": [],
    },
    {
        "name": "Plato vacio",
        "ingredients": [],
    },
    {
        "name": "Tazon de arroz",
        "ingredients": [
            ingredients[0]
        ]
    },
    {
        "name": "Onigiri",
        "ingredients": [
            ingredients[0],
            ingredients[1]
        ]
    },
    {
        "name": "Sushi",
        "ingredients": [
            ingredients[0],
            ingredients[1],
            ingredients[2],
        ]
    }
]

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

let RandomDish1 = getRandomInt(2,4);
let RandomDish2 = getRandomInt(2,4);
let RandomDish3 = getRandomInt(2,4);
let RandomDish4 = getRandomInt(2,4);
let RandomDish5 = getRandomInt(2,4);
let RandomDish6 = getRandomInt(2,4);
let RandomDish7 = getRandomInt(2,4);

let RandomPts1 = getRandomInt(50,100);
let RandomPts2 = getRandomInt(50,100);
let RandomPts3 = getRandomInt(50,100);
let RandomPts4 = getRandomInt(50,100);
let RandomPts5 = getRandomInt(50,100);
let RandomPts6 = getRandomInt(50,100);
let RandomPts7 = getRandomInt(50,100);

const customers = [
    {
        "id": "client_1",
        "order": dishes[RandomDish1],
        "pts": RandomPts1,
        "waitingTime": 30000,
        "position": {
            1: {"x": -2, "z": 3},
            2: {"x": 3, "z": 3},
            3: {"x": -6, "z": -6},
        },
        "mesh": "",
        "boundingBox": "",
        "orderTaken": false,
        "orderDelivered": false,
        "spawned": false
    },
    {
        "id": "client_2",
        "order": dishes[RandomDish2],
        "pts": RandomPts2,
        "waitingTime": 30000,
        "position": {
            1: {"x": -2, "z": 3},
            2: {"x": 3, "z": 12},
            3: {"x": -6, "z": -6},
        },
        "mesh": "",
        "boundingBox": "",
        "orderTaken": false,
        "orderDelivered": false,
        "spawned": false
    },
    {
        "id": "client_3",
        "order": dishes[RandomDish3],
        "pts": RandomPts3,
        "waitingTime": 30000,
        "position": {
            1: {"x": -2, "z": 3},
            2: {"x": 10, "z": 12},
            3: {"x": -6, "z": -6},
        },
        "mesh": "",
        "boundingBox": "",
        "orderTaken": false,
        "orderDelivered": false,
        "spawned": false
    },
    {
        "id": "client_4",
        "order": dishes[RandomDish4],
        "pts": RandomPts4,
        "waitingTime": 30000,
        "position": {
            1: {"x": -2, "z": 3},
            2: {"x": 3, "z": -4},
            3: {"x": -6, "z": -6},
        },
        "mesh": "",
        "boundingBox": "",
        "orderTaken": false,
        "orderDelivered": false,
        "spawned": false
    }
    ,
    {
        "id": "client_5",
        "order": dishes[RandomDish5],
        "pts": RandomPts5,
        "waitingTime": 30000,
        "position": {
            1: {"x": -2, "z": 3},
            2: {"x": -10, "z": 3},
            3: {"x": -6, "z": -6},
        },
        "mesh": "",
        "boundingBox": "",
        "orderTaken": false,
        "orderDelivered": false,
        "spawned": false
    },
    {
        "id": "client_6",
        "order": dishes[RandomDish6],
        "pts": RandomPts6,
        "waitingTime": 30000,
        "position": {
            1: {"x": -2, "z": 3},
            2: {"x": -10, "z": -5},
            3: {"x": -6, "z": -6},
        },
        "mesh": "",
        "boundingBox": "",
        "orderTaken": false,
        "orderDelivered": false,
        "spawned": false
    },
    {
        "id": "client_7",
        "order": dishes[RandomDish7],
        "pts": RandomPts7,
        "waitingTime": 30000,
        "position": {
            1: {"x": -2, "z": 3},
            2: {"x": 3, "z": 12},
            3: {"x": -6, "z": -6},
        },
        "mesh": "",
        "boundingBox": "",
        "orderTaken": false,
        "orderDelivered": false,
        "spawned": false
    }
]

const orders = []

const items = [
    {
        "name": "Multiplicador de velocidad",
        "position": {
            1: { "x": -14, "z": 11 },
            2: { "x": -7, "z": -3 },
            3: { "x": -3, "z": 3 },
        },
        "duration": 10000,
        "mesh": "Models/Food/glTF/FoodIngredient_Squid.gltf",
        "boundingBox": "",
        "spawned": true
    },
    {
        "name": "Multiplicador de puntos",
        "position": {
            1: { "x": -19, "z": -27 },
            2: { "x": -11, "z":15 },
            3: { "x": -21, "z": -33 },
        },
        "duration": 30000,
        "mesh": "Models/Food/glTF/FoodIngredient_Shimesaba.gltf",
        "boundingBox": "",
        "spawned": true
    },
    {
        "name": "Mas tiempo",
        "position": {
            1: { "x": 11, "z": 12 },
            2: { "x": 20, "z":7 },
            3: { "x": -12, "z": 14 },
        },
        "duration": 1,
        "mesh": "Models/Food/glTF/Food_SalmonRoll.gltf",
        "boundingBox": "",
        "spawned": true
    },
]

let basuraMesh
let basuraBB
new GLTFLoader().load('Models/Environment/glTF/Environment_Pot_2_Empty.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            object.castShadow=true;
        } 
    });
    model.scale.set(2,2,2)
    basuraMesh=model;
basuraMesh.position.x = trash.position[indexMapa].x;
basuraMesh.position.z = trash.position[indexMapa].z;
 basuraBB = new THREE.Box3().setFromObject(basuraMesh);
scene.add(basuraMesh);})

let platoMesh;
let platoBB
new GLTFLoader().load('Models/Environment/glTF/Environment_Bowl.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            object.castShadow=true;
        } 
    });
    model.scale.set(5,5,5)
    platoMesh=model;
platoMesh.position.x = plates.position[indexMapa].x;
platoMesh.position.z = plates.position[indexMapa].z;
platoBB = new THREE.Box3().setFromObject(platoMesh);
scene.add(platoMesh);
})

let arrozMesh
new GLTFLoader().load('Models/Food/glTF/FoodIngredient_Rice.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            object.castShadow=true;
        } 
    });
    model.scale.set(5,5,5)
    arrozMesh=model;
arrozMesh.position.x = ingredients[0].position[indexMapa].x;
arrozMesh.position.z = ingredients[0].position[indexMapa].z;
let arrozBB = new THREE.Box3().setFromObject(arrozMesh);
ingredients[0].boundingBox = arrozBB
scene.add(arrozMesh);})

let algasMesh
new GLTFLoader().load('Models/Food/glTF/FoodIngredient_Nori.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            object.castShadow=true;
        } 
    });
    model.position.y=0.3;
    model.scale.set(5,5,5)
    algasMesh=model;
algasMesh.position.x = ingredients[1].position[indexMapa].x;
algasMesh.position.z = ingredients[1].position[indexMapa].z;
let algasBB = new THREE.Box3().setFromObject(algasMesh);
ingredients[1].boundingBox = algasBB;
scene.add(algasMesh);
})


let salmonMesh
new GLTFLoader().load('Models/Food/glTF/FoodIngredient_Salmon.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            object.castShadow=true;
        } 
    });
    model.scale.set(5,5,5)
    salmonMesh=model;
    salmonMesh.position.x = ingredients[2].position[indexMapa].x;
    salmonMesh.position.z = ingredients[2].position[indexMapa].z;
    let salmonBB = new THREE.Box3().setFromObject(salmonMesh);
    ingredients[2].boundingBox = salmonBB
    scene.add(salmonMesh);
})

let velocidadMesh
new GLTFLoader().load(items[0].mesh, function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            object.castShadow=true;
        } 
    });
    model.scale.set(2,2,2)
    velocidadMesh=model;
    velocidadMesh.position.x = items[0].position[indexMapa].x;
    velocidadMesh.position.y = 2;
    velocidadMesh.position.z = items[0].position[indexMapa].z;
    let velocidadBB = new THREE.Box3().setFromObject(velocidadMesh);
    items[0].mesh = velocidadMesh
    items[0].boundingBox = velocidadBB
    scene.add(velocidadMesh);
})

let multPuntosMesh
new GLTFLoader().load(items[1].mesh, function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            object.castShadow=true;
        } 
    });
    model.scale.set(6,6,6)
    multPuntosMesh=model;
    multPuntosMesh.position.x = items[1].position[indexMapa].x;
    multPuntosMesh.position.y = 3;
    multPuntosMesh.position.z = items[1].position[indexMapa].z;
    let multPuntosBB = new THREE.Box3().setFromObject(multPuntosMesh);
    items[1].mesh = multPuntosMesh
    items[1].boundingBox = multPuntosBB
    scene.add(multPuntosMesh);
})

let sumTiempoMesh
new GLTFLoader().load(items[2].mesh, function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            object.castShadow=true;
        } 
    });
    model.scale.set(6,6,6)
    sumTiempoMesh=model;
    sumTiempoMesh.position.x = items[2].position[indexMapa].x;
    sumTiempoMesh.position.y = 1;
    sumTiempoMesh.position.z = items[2].position[indexMapa].z;
    let sumTiempoBB = new THREE.Box3().setFromObject(sumTiempoMesh);
    items[2].mesh = sumTiempoMesh
    items[2].boundingBox = sumTiempoBB
    scene.add(sumTiempoMesh);
})



//Skybox
new THREE.TextureLoader().load("skibox.jpg",(texture)=>{
    const rt= new THREE.WebGLCubeRenderTarget(3072);
    rt.fromEquirectangularTexture(renderer, texture)
    scene.background=rt.texture;
})

//Plano
/*
const geometry = new THREE.PlaneGeometry( 300, 300 );
const material = new THREE.MeshBasicMaterial( {color: 'grey', side: THREE.DoubleSide} );
const plane = new THREE.Mesh( geometry, material );
plane.rotation.x = Math.PI * 0.5
scene.add( plane );
*/


//Colisiones del mapa
var mapColissions=[]

//Qué mapa elegir
function chooseMap(indexMapa){
    const nivel={
    1:'Mapas/GCWFirstMap.glb',
    2: 'Mapas/GCWSecondMap.glb',
    3: 'Mapas/GCWThirdMap.glb'
}
    const nivelDefault='Mapas/GCWFirstMap.glb';
    let nivelJugar=nivel[indexMapa]||nivelDefault;
    return nivelJugar
}

//Modelo del mapa
 new GLTFLoader().load(chooseMap(indexMapa), function(gltf){
     
    gltf.scene.position.x = 2;
    gltf.scene.position.z = 5;
    gltf.scene.traverse((hijo)=>{
       
      let cube2BB = new THREE.Box3();
      cube2BB.setFromObject(hijo);
    /*
        Para ver las colisiones del mapa
        const helper = new THREE.Box3Helper( cube2BB, 0xffff00 );
        scene.add( helper );
    */
      mapColissions.push(cube2BB);
    })
    
 mapColissions.push(new THREE.Box3().setFromObject(downCollision))
 mapColissions.push(new THREE.Box3().setFromObject(upCollision))
 mapColissions.push(new THREE.Box3().setFromObject(leftCollision))
 mapColissions.push(new THREE.Box3().setFromObject(rightCollision))
    scene.add(gltf.scene);
 });

 var VolMus = 0.5;
 var VolVFX= 0.5;

 var sliderMusica = document.querySelector(".inputMusica");
    sliderMusica.oninput = function(){
     var progressBarMusica = document.querySelector(".progressMusica");
     progressBarMusica.value = sliderMusica.value;
     var sliderValueMusica = document.querySelector(".sliderValueMusica");
     sliderValueMusica.innerHTML = sliderMusica.value;
     VolMus = sliderMusica.value / 100;
    }

var slider = document.querySelector(".inputVFX");
	    slider.oninput = function(){
		var progressBar = document.querySelector(".progressVFX");
		progressBar.value = slider.value;
		var sliderValue = document.querySelector(".sliderValueVFX");
		sliderValue.innerHTML = slider.value;
        VolVFX = slider.value / 100;
	}



const btnGuardarConfig = document.querySelector("#btnGuardarConfig");
btnGuardarConfig.addEventListener('click', e => {
    e.preventDefault();
    backgroundMusic.setVolume(VolMus);
    trashSound.setVolume(VolVFX);
    dishSound.setVolume(VolVFX);
    happySound.setVolume(VolVFX);
    happySound.setVolume(VolVFX);
    console.log(VolMus);
    console.log(VolVFX);
})

//Sonido
const listener = new THREE.AudioListener();
const backgroundMusic= new THREE.Audio(listener);
const trashSound= new THREE.Audio(listener);
const pickupSound= new THREE.Audio(listener);
const dishSound= new THREE.Audio(listener);
const happySound= new THREE.Audio(listener);
const takeorderSound= new THREE.Audio(listener);
const audioLoader= new THREE.AudioLoader();
audioLoader.load("Audio/Zazie.mp3", function(buffer){
    backgroundMusic.setBuffer(buffer);
    backgroundMusic.setLoop(true);
    backgroundMusic.setVolume(VolMus);
    backgroundMusic.play();
})
audioLoader.load("Audio/basura.wav", function(buffer){
    trashSound.setBuffer(buffer);
    trashSound.setLoop(false);
    trashSound.setVolume(VolVFX);
})
audioLoader.load("Audio/recoger.wav", function(buffer){
    pickupSound.setBuffer(buffer);
    pickupSound.setLoop(false);
    pickupSound.setVolume(VolVFX);
})
audioLoader.load("Audio/plato.wav", function(buffer){
    dishSound.setBuffer(buffer);
    dishSound.setLoop(false);
    dishSound.setVolume(VolVFX);
})
audioLoader.load("Audio/clientefeliz.wav", function(buffer){
    happySound.setBuffer(buffer);
    happySound.setLoop(false);
    happySound.setVolume(VolVFX);
})
audioLoader.load("Audio/tomarorden.wav", function(buffer){
    takeorderSound.setBuffer(buffer);
    takeorderSound.setLoop(false);
    happySound.setVolume(VolVFX);
})
camera.add(listener);

const particleCount = 1000;
const particleRadius = 0.4;

const textureLoader = new THREE.TextureLoader();


const particles = new THREE.Group();
textureLoader.load('imagenes/estrella.png', function(imagen){
    for (let i = 0; i < particleCount; i++) {
        const particleMaterial = new THREE.SpriteMaterial({
            color: 0xffffff,
            map: imagen.clone(),
            transparent: true,
            opacity: Math.random(),
        });
    
        const particle = new THREE.Sprite(particleMaterial);
        particle.scale.set(particleRadius, particleRadius, 1); 
        particle.position.set(
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50
        );
        particles.add(particle);
    }
    
    scene.add(particles);
    
});


var charactercontrols;


//Escribir
function writeUserData(roomId, userId, pts, positionX, positionZ) {
    set(ref(db, 'roomPlayers' + '/' + roomId + '/' + userId), {
        pts: pts,
        status: "conectado",
        user_name: statsPlayer.name,
        position: {
            x: positionX,
            z: positionZ
        }
    });
    //console.log(positionX,positionZ)
}


function getRemoteTimer() {
    const roomRef = ref(db, 'room/' + currentRoom + '/timer');

    return get(roomRef)
        .then((snapshot) => {
            const currentTimerValue = snapshot.val();
            return currentTimerValue;
        })
        .catch((error) => {
            console.error('Error al obtener el valor del temporizador:', error);
            throw error; 
        });
}

function updateRemoteTimer() {
    const roomRef = ref(db, 'room/' + currentRoom + '/timer');

    getRemoteTimer()
        .then((currentTimerValue) => {
            if (typeof currentTimerValue === 'number') {
                const updatedTimerValue = currentTimerValue - 1;

                return set(roomRef, updatedTimerValue);
            } else {
                console.error('El valor del temporizador no es un número.');
                throw new Error('El valor del temporizador no es un número.');
            }
        })
        .then(() => {
            console.log('Temporizador actualizado correctamente en la base de datos.');
        })
        .catch((error) => {
            console.error('Error al actualizar el temporizador en la base de datos:', error);
        });
}



spawnPlayerModel()
//Leer
function spawnPlayerModel() {
    if(gameMode == "Multiplayer") {
        if(currentRoom != "") {
            const starCountRef = ref(db, 'roomPlayers' + '/' + currentRoom);
            onValue(starCountRef, (snapshot) => {
                const data = snapshot.val();
                
                Object.entries(data).forEach(([key, value]) => {
                    
                    const player = scene.getObjectByName(key);
                    
                    if(!player) {           
                        new GLTFLoader().load('Panda.gltf', function(gltf){
                            const model = gltf.scene;
                            model.traverse(object=>{
                                if(object.isMesh) {
                                    if(object.name=="Knife")object.visible=false;
                                    object.castShadow=true;
                                } 
                            });
                            model.position.set(value.position.x,0,value.position.z);
                            model.name = key;
                            // Animaciones
                            const gltfAnimations=gltf.animations;
                            const mixer=new THREE.AnimationMixer(model);
                            const animationMap=new Map();
                            gltfAnimations.filter(a=>a.name!=!'TPose').forEach((a)=>{
                                animationMap.set(a.name,mixer.clipAction(a))
                            })
                            if(model.name ==  statsPlayer.uid) {
                                charactercontrols = new CharacterControls(model, mixer, animationMap, controls, camera, 'Idle')
                            }
                            scene.add(model);
                        });
                    }
                    else { 
                        scene.getObjectByName(key).position.x = value.position.x;
                        scene.getObjectByName(key).position.z = value.position.z;
                    }
                    
                });
            });
        }
    }
    else {
        new GLTFLoader().load('Panda.gltf', function(gltf){
            const model = gltf.scene;
            model.traverse(object=>{
                if(object.isMesh) {
                    if(object.name=="Knife")object.visible=false;
                    object.castShadow=true;
                } 
            });
            model.position.set(5,0,0);
            model.name = statsPlayer.uid;
            // Animaciones
            const gltfAnimations=gltf.animations;
            const mixer=new THREE.AnimationMixer(model);
            const animationMap=new Map();
            gltfAnimations.filter(a=>a.name!=!'TPose').forEach((a)=>{
                animationMap.set(a.name,mixer.clipAction(a))
            })
            charactercontrols = new CharacterControls(model, mixer, animationMap, controls, camera, 'Idle')
            scene.add(model);
        });
    }
}



const clock = new THREE.Clock();

//Movimiento de camara
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping=true;
controls.minDistance=40;
controls.maxDistance=40;
controls.enablePan=true;
controls.autorotate=false;
controls.enableRotate=false;
controls.maxPolarAngle=Math.PI/2-0.05;
controls.update();

//MODELO DE CLIENTE
var arrCustModels=[];
new GLTFLoader().load('Rabbit_Purple.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            if(object.name=="Knife"||object.name=="Pan")object.visible=false;
            object.castShadow=true;
        } 
    });
    arrCustModels.push(model);
})
new GLTFLoader().load('Rabbit_Grey.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            if(object.name=="Knife"||object.name=="Pan")object.visible=false;
            object.castShadow=true;
        } 
    });
    arrCustModels.push(model);
})
new GLTFLoader().load('Rabbit_Cyan.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            if(object.name=="Knife"||object.name=="Pan")object.visible=false;
            object.castShadow=true;
        } 
    });
    arrCustModels.push(model);
})
new GLTFLoader().load('Rabbit_Blond.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            if(object.name=="Knife"||object.name=="Pan")object.visible=false;
            object.castShadow=true;
        } 
    });
    arrCustModels.push(model);
})
new GLTFLoader().load('Rabbit_Purple.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            if(object.name=="Knife"||object.name=="Pan")object.visible=false;
            object.castShadow=true;
        } 
    });
    arrCustModels.push(model);
})
new GLTFLoader().load('Rabbit_Grey.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            if(object.name=="Knife"||object.name=="Pan")object.visible=false;
            object.castShadow=true;
        } 
    });
    arrCustModels.push(model);
})
new GLTFLoader().load('Rabbit_Cyan.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            if(object.name=="Knife"||object.name=="Pan")object.visible=false;
            object.castShadow=true;
        } 
    });
    arrCustModels.push(model);
})

//SPAWNEAR CLIENTES
let ArrayModelosSpawneados = [
    {NumModelo : 10 }
];
function spawnCustomer(customer) {
    var random = 0;
    var salirAFuerza = 0;
    do {
        var repetir = 0;
        random = Math.floor(Math.random() * arrCustModels.length);
        console.log(random);
        ArrayModelosSpawneados.forEach(model => {
            if (random == model.NumModelo){
                repetir = 1;
            }
        })
        salirAFuerza = salirAFuerza + 1;
        console.log(salirAFuerza);
    }while(repetir == 1 || salirAFuerza > 6);
    
    ArrayModelosSpawneados.push(
        { NumModelo: random }
    );

    const clientMesh = arrCustModels[random];

    clientMesh.position.x = customer.position[indexMapa].x;
    clientMesh.position.z = customer.position[indexMapa].z;
    let clientBB = new THREE.Box3().setFromObject(clientMesh);

    customer.mesh = clientMesh
    customer.boundingBox = clientBB

    scene.add(customer.mesh);
    customer.spawned = true
}

function deliverCustomerOrder(customer) {

    function keyPressed(e) {
        if(e.key == 'e' || e.key == 'E') {
            if(!customer.orderDelivered) {
                if (!statsPlayer.inventory.dishes[0]) {
                    showAlert('item-picked', "NO TIENES PLATILLOS EN EL INVENTARIO!")
                    printOrders()
                }
                else if(statsPlayer.inventory.dishes[0].name == customer.order.name && customer.spawned == true) {

                    //Agregar puntos al usuario
                    if(statsPlayer.inventory.items.length > 0) {
                        if(statsPlayer.inventory.items[0].name = "Multiplicador de puntos") {
                            statsPlayer.pts += (customer.pts) * 1.15
                            statsPlayer.pts = Math.floor(statsPlayer.pts)
                            writeUserData(currentRoom, statsPlayer.uid, statsPlayer.pts, charactercontrols.getPosX(),charactercontrols.getPosZ())
                        }
                        else {
                            statsPlayer.pts += customer.pts
                            writeUserData(currentRoom, statsPlayer.uid, statsPlayer.pts, charactercontrols.getPosX(),charactercontrols.getPosZ())
                        }
                    }
                    else {
                        statsPlayer.pts += customer.pts
                        writeUserData(currentRoom, statsPlayer.uid, statsPlayer.pts, charactercontrols.getPosX(),charactercontrols.getPosZ())
                    }

                    printStats()
                    printOrders()    
                    if(statsPlayer.inventory.dishes.length > 0) {
                        statsPlayer.inventory.dishes[0].ingredients = []
                        statsPlayer.inventory.dishes.splice(0, 1)
                        showAlert('item-picked', "ORDEN ENTREGADA!")
                        transformDish()
                        printInventory()
                        happySound.play()
                    }
                    customer.orderDelivered = true
                    customer.boundingBox = null
                    customer.orderTaken = false
                    despawnCustomer(customer)
                    printStats()
                    printOrders()
                    
                }
                else {
                    showAlert('item-picked', "ORDEN EQUIVOCADA!")
                    printOrders()
                }
            }
            else {
                document.removeEventListener('keyup', keyPressed);
                printOrders()
            }
        }
    }

    document.addEventListener('keyup', keyPressed)
}

var Timer = function(callback, delay) {
    var timerId, start, remaining = delay;

    this.pause = function() {
        window.clearTimeout(timerId);
        timerId = null;
        remaining -= Date.now() - start;
    };

    this.resume = function() {
        if (timerId) {
            return;
        }

        start = Date.now();
        timerId = window.setTimeout(callback, remaining);
    };

    this.resume();
};

//TOMAR ORDEN Y EMPEZAR LA CUENTA REGRESIVA DEL CLIENTE
function takeCostumerOrder(customer) {

    function keyPressed(e) {
        if(e.key == 'e' || e.key == 'E') {

            if(!customer.orderTaken) {       
                customer.orderTaken = true;
                takeorderSound.play();
                showAlert('item-picked', "ORDEN TOMADA: " + (customer.order.name).toUpperCase());
                printOrders();
                //INICIA CONTADOR DE ESPERA DEL CLIENTE, PARA DESPUES DESPAWNEAR
                setTimeout(() => {
                    despawnCustomer(customer)
                    statsPlayer.pts = statsPlayer.pts - 20;
                    printStats();
                }, customer.waitingTime);
            }
            else {
                document.removeEventListener('keyup', keyPressed);
                printOrders()
            }
        }
    }
    document.addEventListener('keypress', keyPressed)
}

//DESPAWNEAR CLIENTES
function despawnCustomer(customer) {
    scene.remove(customer.mesh);
    customer.spawned = false
    printOrders();
}

function checkCollisions(modelBB) {
    //COLISION BASURA
    if(modelBB.intersectsBox(basuraBB)){
        showAlert('press-button', "PULSA Q PARA TIRAR EL PLATO")
        dropItem('dish', dishes[0])
    }
    //COLISION PLATITOS
    if(modelBB.intersectsBox(platoBB)){
        showAlert('press-button', "PULSA E PARA RECOGER EL PLATO")
        pickItem('dish', dishes[0])
    }
    //COLISIONES INGREDIENTES
    ingredients.forEach(ingredient => {
        if(modelBB.intersectsBox(ingredient.boundingBox)){
            showAlert('press-button', "PULSA E PARA RECOGER " + (ingredient.name).toUpperCase())
            pickItem('ingredient', ingredient)
        }
    })
    //COLISIONES ITEMS
    items.filter(item => item.spawned === true)
    items.forEach(item => {
        try {
            if(modelBB.intersectsBox(item.boundingBox)){
                console.log('hay colision con el item')
                showAlert('press-button', "PULSA E PARA RECOGER " + (item.name).toUpperCase())
                pickItem('item', item)
            }
        }  
        catch(error)  {
            // console.log(error)
        }  
    })
    //COLISIONES DE CLIENTES SOLAMENTE SPAWNEADOS
    if(customers.length > 0) {
        customers.filter(customer => customer.spawned === true)
        .forEach(customer => {       
            if(modelBB.intersectsBox(customer.boundingBox)) {
                if(!customer.orderTaken && !customer.orderDelivered && customer.spawned == true) {
                    showAlert('press-button', "PULSA E PARA TOMAR ORDEN")
                    takeCostumerOrder(customer)
                }
                else if(customer.orderTaken && !customer.orderDelivered && customer.spawned == true) {
                    showAlert('press-button', "PULSA E PARA ENTREGAR ORDEN")
                    deliverCustomerOrder(customer)
                }
            }
        })
    }

    mapColissions.forEach((element,iterador) => {
        if(iterador!=0)
        if(modelBB.intersectsBox(element)){
          charactercontrols.setPrevPos();
        }
    });
}

function pickItem(itemType,item) {

    document.addEventListener('keyup', function keyPressed(e) {
        if(e.key == 'e' || e.key == 'E') {
            
            if(itemType == 'dish' && statsPlayer.inventory.dishes.length <= 0) {
                statsPlayer.inventory.dishes.push(item)
                showAlert('item-picked', "PLATO RECOGIDO!")
                transformDish()
                printInventory()
                dishSound.play();
            }
            // else {
            //     showAlert('item-picked', "YA TIENES UN PLATO EN EL INVENTARIO!")
            // }
            if(itemType == 'ingredient') {
                if(statsPlayer.inventory.dishes.length > 0) {
                    if(statsPlayer.inventory.dishes[0].ingredients.length <= 0) {
                        statsPlayer.inventory.dishes[0].ingredients.push(item)
                        showAlert('item-picked', (item.name).toUpperCase() + " RECOGIDO!")
                        transformDish()
                        printInventory()
                        pickupSound.play();
                    }
                    else {
                        let itemAlreadyExists = statsPlayer.inventory.dishes[0].ingredients.includes(item);

                        if (!itemAlreadyExists) {
                            statsPlayer.inventory.dishes[0].ingredients.push(item)
                            showAlert('item-picked', (item.name).toUpperCase() + " RECOGIDO")
                            transformDish()
                            printInventory();
                            pickupSound.play();
                        } 
                        // else {
                        //     showAlert('item-picked', "YA TIENES ESTE INGREDIENTE EN EL PLATO");
                        // }
                    }
                }
                else {
                    showAlert('item-picked', "DEBES TENER UN PLATO PARA RECOGER UN INGREDIENTE")
                }
            }

            if(itemType == 'item' && statsPlayer.inventory.items.length <= 0) {
                
                if(item.name == "Mas tiempo") {
                    timerCounter += 1800
                }

                statsPlayer.inventory.items.push(item)
                showAlert('item-picked', item.name.toUpperCase() + " RECOGIDO!")
                printInventory()
                pickupSound.play();
                console.log(statsPlayer)

                item.boundingBox = null
                scene.remove(item.mesh)
                item.spawned = false

                setTimeout(() => {
                    statsPlayer.inventory.items = [];
                    printInventory()
                    console.log(statsPlayer)

                }, item.duration);
            }

        }
    }, { once : true })
}

function dropItem(itemType, item) {
    document.addEventListener('keydown', function drop(e) {
        if(e.key == 'q' || e.key == 'Q') {
            if(itemType == 'dish') {
                if(statsPlayer.inventory.dishes.length > 0) {
                    statsPlayer.inventory.dishes[0].ingredients = []
                    statsPlayer.inventory.dishes.splice(0, 1)
                    showAlert('item-picked', "PLATILLO TIRADO A LA BASURA")
                    transformDish()
                    printInventory()
                    trashSound.play();
                    console.log(statsPlayer)
                }
            }
        }
    })
}

function transformDish() {
    if(statsPlayer.inventory.dishes[0]) {
        let currentIngredients = new Set(statsPlayer.inventory.dishes[0].ingredients);
    
        for (let i = 1; i < dishes.length; i++) {
            const dish = dishes[i];
            let dishIngredients = new Set(dish.ingredients);
    
            if (setsEqual(currentIngredients, dishIngredients)) {
                statsPlayer.inventory.dishes[0].name = dish.name;
                break;
            }
        }
    }
}

// Función para comparar dos sets (conjuntos)
function setsEqual(set1, set2) {
    if (set1.size !== set2.size) return false;
    for (let item of set1) {
        if (!set2.has(item)) return false;
    }
    return true;
}

//PAUSAR EL TIMER
document.addEventListener('keydown', function(e) {
    if(e.key == 'p' || e.key == 'P') {
        if(enPausa == false) {
            enPausa = true;
            const htmlPausa = document.getElementById('contenedor-pausa')
            htmlPausa.style.display = 'block'
            console.log('Pausado');
        }
        else if(enPausa == true) {
            enPausa = false;
            const htmlPausa = document.getElementById('contenedor-pausa')
            htmlPausa.style.display = 'none'
            console.log('Despausado');
        }
    }
})

function showAlert(alertType, message) {

    let gameplayAlert, duration

    switch (alertType) {
        case 'press-button':
            gameplayAlert = document.getElementById('press-button-alert')
            duration = 1000
            break
        case 'item-picked':
            gameplayAlert = document.getElementById('item-picked-alert')
            duration = 4000
            break

    }
    gameplayAlert.style.display = 'block'
    gameplayAlert.innerText = message

    setTimeout(() => {
        gameplayAlert.style.display = 'none';
        gameplayAlert.innerText = '';
    }, duration);

}

printInventory()
function printInventory() {
    const dishesList = document.getElementById('dishes-list')
    const ingredientsList = document.getElementById('ingredients-list')
    const itemsList = document.getElementById('items-list')
    
    ingredientsList.innerHTML = ''; 
    dishesList.innerHTML = ''; 
    itemsList.innerHTML = ''; 

    if(statsPlayer.inventory.dishes.length > 0) {
        statsPlayer.inventory.dishes.forEach((dish) => {
            dishesList.insertAdjacentHTML('beforeend', `<li>${dish.name}</li>`);
        })
    }
    else {
        dishesList.innerHTML = ''; 
    }
    if(statsPlayer.inventory.dishes.length > 0) {
        statsPlayer.inventory.dishes[0].ingredients.forEach((ingredient) => {
            ingredientsList.insertAdjacentHTML('beforeend', `<li>${ingredient.name}</li>`);
        })
    }
    else {
        ingredientsList.innerHTML = ''; 
    }
    if(statsPlayer.inventory.items.length > 0) {
        statsPlayer.inventory.items.forEach((item) => {
            itemsList.insertAdjacentHTML('beforeend', `<li>${item.name}</li>`);
        })
    }
    else {
        itemsList.innerHTML = ''; 
    }
}

printOrders()
function printOrders() {
    const contenedorOrdenes = document.getElementById('orders')
    contenedorOrdenes.innerHTML = ''
    customers.filter(customer => customer.orderTaken && !customer.orderDelivered && customer.spawned == true)
    .forEach(customer => {  
        contenedorOrdenes.insertAdjacentHTML('beforeend', `<li>${customer.order.name}</li>`)
    })
}

printStats()
function printStats() {
    const nombreJugador = document.getElementById('nombre-jugador')
    nombreJugador.innerText = statsPlayer.name
    const puntosJugador = document.getElementById('puntos-jugador')
    puntosJugador.innerText = statsPlayer.pts
}

function printTimer() {
    if(gameMode != "Multiplayer") {
        const timer = document.getElementById('timer')
        timer.innerText = Math.ceil(timerCounter/60) + ' segundos restantes'
    }
    else {
        const timer = document.getElementById('timer')
        getRemoteTimer().then(remoteTimer => {
            timer.innerText = Math.ceil(remoteTimer/60) + ' segundos restantes' 
        })

    }
        
}

//Subir nueva HighScore
function writePuntuacionData(userId, Pts, Nombre) {
    set(ref(db, 'puntuacion/' + userId), {
        Puntos: Pts,
        Name: Nombre
    });
}

function gameOver() {
    const gameOver = document.getElementById('contenedor-game-over')
    const puntuacion = document.getElementById('puntuacion-final')
    gameOver.style.display = 'block'
    puntuacion.innerText = statsPlayer.pts

    //Leer Puntuaciones
    const PtsCountRef = ref(db, 'puntuacion');
    onValue(PtsCountRef, (snapshot) => {
        const data = snapshot.val();
        let siExiste = 0;
        
        Object.entries(data).forEach(([key, value]) => {
            
        if(statsPlayer.uid == key){
            console.log("Si Existes, puntuacion guardad es: " + `${value.Puntos}`);
            siExiste = 1;
            if(statsPlayer.pts > value.Puntos){
                const HighScore = document.getElementById('HighScore');
                HighScore.innerText = "¡Nueva Puntuacion Mas Alta!";
                writePuntuacionData(statsPlayer.uid, statsPlayer.pts, statsPlayer.name);
                console.log("Ya existias, Nueva Puntuacion Mas Alta: " + statsPlayer.pts);
            }
        }

        });
        if(siExiste == 0){//Primera vez que juega
            const HighScore = document.getElementById('HighScore');
            HighScore.innerText = "¡Nueva Puntuacion Mas Alta!";
            console.log("No tenias puntuacion, ahi te va una nueva");
            writePuntuacionData(statsPlayer.uid, statsPlayer.pts, statsPlayer.name);
        }
    });
}

let ArrayPts = [];

function TablaPuntuaciones() {

    const PtsCountRef = ref(db, 'puntuacion');
    onValue(PtsCountRef, (snapshot) => {
        ArrayPts = [];
        const data = snapshot.val();
        
        //console.log("Tabla Puntuaciones");
        Object.entries(data).forEach(([key, value]) => {

        ArrayPts.push(
            { Nombre: `${value.Name}`,
            Score: value.Puntos}
        );
        });

        ArrayPts.sort((a, b) => {
            return b.Score - a.Score;
        });
        console.log(ArrayPts);
    
        const ListaPuntuaciones = document.getElementById('Lista-Puntuaciones')
        ListaPuntuaciones.innerHTML = '';
    
        for (var Player of ArrayPts) {
            ListaPuntuaciones.insertAdjacentHTML('beforeend', `<li>${Player.Nombre}: ${Player.Score}</li>`);
        }
    });
}

let enPausa = false;

function animate() {
    
    requestAnimationFrame(animate);

    if(charactercontrols) {

        charactercontrols.update(clock.getDelta());

        if(charactercontrols.model.name == currentPlayer) {

            const modelBB = new THREE.Box3().setFromObject(charactercontrols.model);

            checkCollisions(modelBB);

            writeUserData(currentRoom, statsPlayer.uid, statsPlayer.pts, charactercontrols.getPosX(),charactercontrols.getPosZ());

            if (!enPausa && gameMode == "Multiplayer"){
                updateRemoteTimer()
                //timerCustomer.resume();
            }
            else if(!enPausa && gameMode != "Multiplayer" ) {
                timerCounter--;
            }
            else if(enPausa && gameMode != "Multiplayer"){
                charactercontrols.setPrevPos();
                //timerCustomer.pause();
            }
            
            printTimer()

            //Evento items
            if(statsPlayer.inventory.items.length > 0) {
                let item = statsPlayer.inventory.items[0]
                if(item.name == "Multiplicador de velocidad") {
                    charactercontrols.walkVelocity = 20
                }
            }
            else {
                charactercontrols.walkVelocity = 8
            }

            //Eventos del temporizador

            if(gameMode != "Multiplayer") {
                //Dificultad Normal
                if(dif == 1){
                    switch (timerCounter) {
                        case 0:
                            gameOver();
                            TablaPuntuaciones();
                            break;
                        case 7100: 
                            spawnCustomer(customers[0])
                            break;
                        case 5400: 
                            spawnCustomer(customers[1])
                            break;
                        case 3600: 
                            spawnCustomer(customers[2])
                            break;
                        case 1800: 
                            spawnCustomer(customers[3])
                            break;
                    }
                }
    
                //Dificultad Dificil
                if(dif == 2){
                    switch (timerCounter) {
                        case 0:
                            gameOver();
                            TablaPuntuaciones();
                            break;
                        case 7100: 
                            spawnCustomer(customers[0])
                            break;
                        case 6000: 
                            spawnCustomer(customers[1])
                            break;
                        case 4800: 
                            spawnCustomer(customers[2])
                            break;
                        case 3600: 
                            spawnCustomer(customers[3])
                            break;
                        case 2400: 
                            spawnCustomer(customers[4])
                            break;
                        case 1200: 
                            spawnCustomer(customers[5])
                            break;
                    }
                }
            }
            else {
                getRemoteTimer().then(remoteTimerCounter => {
                    //Dificultad Normal
                    if(dif == 1){
                        switch (remoteTimerCounter) {
                            case 0:
                                gameOver();
                                TablaPuntuaciones();
                                break;
                            case 7100: 
                                spawnCustomer(customers[0])
                                break;
                            case 5400: 
                                spawnCustomer(customers[1])
                                break;
                            case 3600: 
                                spawnCustomer(customers[2])
                                break;
                            case 1800: 
                                spawnCustomer(customers[3])
                                break;
                        }
                    }
    
                    //Dificultad Dificil
                    if(dif == 2){
                        switch (remoteTimerCounter) {
                            case 0:
                                gameOver();
                                TablaPuntuaciones();
                                break;
                            case 7100: 
                                spawnCustomer(customers[0])
                                break;
                            case 6000: 
                                spawnCustomer(customers[1])
                                break;
                            case 4800: 
                                spawnCustomer(customers[2])
                                break;
                            case 3600: 
                                spawnCustomer(customers[3])
                                break;
                            case 2400: 
                                spawnCustomer(customers[4])
                                break;
                            case 1200: 
                                spawnCustomer(customers[5])
                                break;
                        }
                    }

                }) 
            }
            
        }

    }
    controls.update();


    particles.rotation.x += 0.001;
    particles.rotation.y += 0.001;


    renderer.render( scene, camera );

}

window.addEventListener( 'resize', onWindowResize, false );

if(statsPlayer.uid != "") {
    animate()
}

function onWindowResize(){

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}
