import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  getDoc,
  collection,
  addDoc,
  getDocs,
  doc,
  where,
  query,
} from "firebase/firestore";
import { firebaseConfig } from "./credentials";
import Swal from "sweetalert2";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
var globalUser = null; //application wide variable to check user status

onAuthStateChanged(auth, (user) => {
  if (user !== null) {
    // User is signed in
    globalUser = user;
    userModal(); //modal needs to know the user state before being called
    console.log("Signed in.");
  } else {
    // User is signed out
    userModal();
    console.log("Signed out.");
  }
});

//Api constants
const baseURL = "https://www.thecocktaildb.com/api/json/v1/1/";
const searchURL = "search.php?";
const lookupURL = "lookup.php?";
const byName = "s=";
const byId = "i=";
const byFirstLetter = "f=";

//User feedback
const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 5000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

//----------USER CRUD----------\\

function userModal() {
  if (globalUser !== null) {
    //if signed in, display logout button and username
    $("#logout").css("display", "block");
    $("#userWrapper p").html(globalUser.displayName);

    //listen for logout click
    $("#logout").on("click", () => {
      logoutUser(auth);
    });
  } else {
    //if not signed in, display "sign in" and no log out button
    $("#logout").css("display", "none");
    $("#userWrapper p").html("Sign In");

    //send to sign in or create forms via buttons
    $("#userWrapper").on("click", () => {
      Swal.fire({
        title: "Do have an account?",
        icon: "question",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        cancelButtonText: "Cancel",
        denyButtonText: "Create Account",
        denyButtonColor: "#3085d6",
        confirmButtonText: "Sign In",
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: "Log In With Existing Account",
            html: `
              <input type="email" id="email" class="swal2-input" placeholder="Email">
              <input type="password" id="password" class="swal2-input" placeholder="Password">
            `,
            focusConfirm: false,
            icon: "info",
            confirmButtonText: "Log In",
            showCancelButton: true,
            cancelButtonText: "Cancel",
            cancelButtonColor: "#d33",
            confirmButtonColor: "#3085d6",
            preConfirm: () => {
              let emailInput = $("#email").val();
              let passwordInput = $("#password").val();
              loginUser(emailInput, passwordInput);
            },
          });
        } else if (result.isDenied) {
          Swal.fire({
            title: "Create Account",
            html: `
              <input type="text" id="username" class="swal2-input" placeholder="Username">
              <input type="email" id="email" class="swal2-input" placeholder="Email">
              <input type="password" id="password" class="swal2-input" placeholder="Password">
            `,
            focusConfirm: false,
            icon: "info",
            confirmButtonText: "Create",
            showCancelButton: true,
            cancelButtonText: "Cancel",
            cancelButtonColor: "#d33",
            preConfirm: () => {
              let usernameInput = $("#username").val();
              let emailInput = $("#email").val();
              let passwordInput = $("#password").val();
              createUser(usernameInput, emailInput, passwordInput);
            },
          });
        }
      });
    });
  }
}

function createUser(uName, email, pw) {
  createUserWithEmailAndPassword(auth, email, pw)
    .then((userCredentials) => {
      //created profile: username, email, pw
      updateProfile(auth.currentUser, {
        displayName: uName,
      });

      //create document in firestore
      let newUser = {
        email: email,
        favorites: [],
        reviews: [],
        lists: [],
        userId: userCredentials.user.uid,
        username: uName,
      };

      addUser(newUser);

      console.log("Created ", userCredentials.user);
    })
    .catch((error) => {
      console.log("Error creating user: ", error.message);
      Toast.fire({
        icon: "error",
        title: "Error creating an account!",
        text: error.message
      });
    });
}

async function addUser(newUser) {
  try {
    const docRef = await addDoc(collection(db, "CocktailDBUsers"), newUser);
    Toast.fire({
      icon: "success",
      title: "Account created successfully!",
    });
    console.log("Doc id: " + docRef.id);
  } catch (e) {
    console.log("Error adding to db: ", e);
    Toast.fire({
      icon: "error",
      title: "Error creating an account!",
      text: e.message
    });
  }
}

function loginUser(email, password) {
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredentials) => {
      userModal();
      Toast.fire({
        icon: "success",
        title: "Signed in successfully!",
      });
    })
    .catch((e) => {
      console.log("Error signing in", e.message);
      Toast.fire({
        icon: "error",
        title: "Error signing in!",
        text: error.message
      });
    });
}

function logoutUser(auth) {
  signOut(auth)
    .then(() => {
      globalUser = null; //set current
      userModal();
      Toast.fire({
        icon: "success",
        title: "Signed out successfully!",
      });
    })
    .catch((e) => {
      console.log("Error signing out: ", e.message);
      Toast.fire({
        icon: "error",
        title: "Error signing out!",
      });
    });
}

function viewUser() {
  //get user information from storage to make graphs
  if (!globalUser) {
    $("#app").html("You need to log in or sign up first.");
  }
}

function updateUser() {
  //username, password, email, bio
}

function deleteUser() {
  //remove document from firestore
}

//---------USER ACTIONS---------\\

function addToFavorites() {
  //from details view, add a certain item to a user's favorites
}

function addReview() {
  //from details view, add a review by the user on a certain item
  //review added to separate storage. array of reviews, api item id included
}

//----------API----------\\

export function index(letter) {
  let byLetterURL = `${baseURL}${searchURL}${byFirstLetter}${letter}`;
  let alphabet = [..."abcdefghijklmnopqrstuvwxyz"];

  $.getJSON(byLetterURL, (data) => {
    data = data.drinks;

    data.forEach((drink) => {
      $("#listData").append(`
        <a href="#view_${drink.idDrink}" class="drinkItem">
            <p>${drink.strDrink}</p>
            <img src="${drink.strDrinkThumb}" alt="DrinkImg">
        </a>
      `);
    });
  });

  $("#list").append(`<div class="letterPagination"></div>`);

  alphabet.forEach((letter) => {
    $(".letterPagination").append(`<a href="#home_${letter}">${letter}</a>`);
  });
}

export function view(id) {
  let byIdUrl = `${baseURL}${lookupURL}${byId}${id}`;
  console.log(byIdUrl);

  $.getJSON(byIdUrl, (data) => {
    data = data.drinks[0];
    let instructions = data.strInstructions.split(".");

    $("#viewItem").prepend(`<img src="${data.strDrinkThumb}" alt="DrinkImg">`);
    $("#name").append(`${data.strDrink}`);
    $("#extraInfo").append(`<li>${data.strAlcoholic}</li>`);
    $("#extraInfo").append(`<li>${data.strCategory}</li>`);
    $("#extraInfo").append(`<li>Use with a ${data.strGlass}</li>`);

    instructions.forEach((sentence) => {
      if (sentence == "") {
        return;
      }
      $("#instructions").append(`<li>${sentence}.</li>`);
    });

    for (const prop in data) {
      let nums = [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
      ];

      nums.forEach((num) => {
        let ingredient = "strIngredient" + num;
        let measure = "strMeasure" + num;

        if (prop == ingredient && data[prop] !== null) {
          $("#ingredients").append(`<li id="${num}">${data[prop]}</li>`);
        }

        if (prop == measure && data[prop] !== null) {
          $(`#ingredients li#${num}`).prepend(`${data[prop]}`);
        }
      });
    }
  });
  //get specific item from api, display details
  //include review, add to favorites, and add to custom list buttons if user is logged in
  //include reviews section: avg star rating and worded reviews
}

export function search() {
  let term = $("#searchBtn").val();
  let byNameUrl = `${baseURL}${searchURL}${byName}${term}`;
  $("h1").append(`${term}"`);

  $.getJSON(byNameUrl, (data) => {
    data = data.drinks;

    if (data === null) {
      $("#listData").html(`No results.`);
    } else {
      data.forEach((drink) => {
        $("#listData").append(`
          <a href="#view_${drink.idDrink}" class="drinkItem">
              <p>${drink.strDrink}</p>
              <img src="${drink.strDrinkThumb}" alt="DrinkImg">
          </a>
        `);
      });
    }
  });
}

//---------PAGE ROUTING---------\\

function getPageAndFunction(page, myFunction) {
  $.get(`pages/${page}.html`, (data) => {
    $("#app").html(data);
    myFunction();
  });
}

function pagination(letter) {
  $.get(`pages/list.html`, (data) => {
    $("#app").html(data);
    if (letter == "home") {
      index("a");
    } else {
      index(letter);
    }
  });
}

export function changeRoute() {
  let hashTag = window.location.hash;
  let pageID = hashTag.replace("#", "");
  let pageLetterID = pageID.split("_").pop(); //letter for pagination
  let itemID = pageID.split("_").pop(); //item id for single view
  pageID = pageID.split("_").shift(); //page id for index view

  switch (pageID) {
    case "":
      pagination("a");
      break;
    case "home":
      pagination(pageLetterID);
      break;
    case "view":
      getPageAndFunction(pageID, view(itemID));
      break;
    case "search":
      getPageAndFunction(pageID, search);
      break;
    case "user":
      //user page
      break;
    case "lists":
      //custom lists from user
      break;
    case "favorites":
      //personal favorites
      break;
    case "reviews":
      //reviews on a certain item
      break;
    // default:
    //   $.get(`pages/${pageID}.html`, function (data) {
    //     $("#app").html(data);
    //   });
  }
}
