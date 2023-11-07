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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
var globalUser = null; //application wide variable to check user status
var currentItem = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    globalUser = user;
    userModal(); //modal needs to know the user state before being called
    console.log("Signed in.");
  } else {
    // User is signed out
    userModal();
    updateUserDisplay();
    console.log("You need to sign in.");
  }
});

//Api constants
const baseURL = "https://www.thecocktaildb.com/api/json/v1/1/";
const searchURL = "search.php?";
const lookupURL = "lookup.php?";
const byName = "s=";
const byId = "i=";
const byFirstLetter = "f=";

//----------USER CRUD----------\\

function userModal() {
  updateUserDisplay();

  //if there is a logged in user
  if (globalUser === null) {
    //allow modal open
    $("#userWrapper").on("click", () => {
      $("#modalBackground").css("display", "block");
      $("#modal").html(`
        <div class="modalInputs">
            <input type="text" id="uNameCreate" placeholder="Username" class="paramInput" />
            <input type="email" id="emailCreate" placeholder="Email" class="paramInput" />
            <input type="password" id="pwCreate" placeholder="Password" class="paramInput" />
            <input type="submit" value="Create Account" id="createAcctBtn" />
            <div class="error"></div>
        </div>
        <div class="modalInputs">
          <input type="email" id="email" placeholder="Email" class="paramInput" />
          <input type="password" id="pw" placeholder="Password" class="paramInput" />
          <input type="submit" value="Login" id="loginBtn" />
        </div>
      `);

      $("#createAcctBtn").on("click", () => {
        createUser();
      });

      $("#loginBtn").on("click", () => {
        loginUser();
      });
    });

    //close modal on click off
    $("#modalBackground").on("click", () => {
      $("#modalBackground").css("display", "none");
    });
  } else {
    //listen for logout click
    $("#logout").on("click", () => {
      logoutUser(auth);
    });
  }
}

function createUser() {
  $(".error").html("");
  let uName = $("#uNameCreate").val();
  let email = $("#emailCreate").val();
  let pw = $("#pwCreate").val();

  if (!uName || !email || !pw) {
    return $(".error").html("Form must be complete.").css("color", "red");
  }

  createUserWithEmailAndPassword(auth, email, pw)
    .then((userCredentials) => {
      updateProfile(auth.currentUser, {
        displayName: uName,
      });

      //create document in firestore
      let newUser = {
        email: email,
        favorites: [],
        reviews: [],
        customLists: [],
        userId: userCredentials.user.uid,
        username: uName,
      };

      addUser(newUser);

      console.log("Created ", userCredentials.user);

      clearForms();
      updateUserDisplay();
    })
    .catch((error) => {
      console.log("Error creating user: ", error.message);
    });
}

async function addUser(newUser) {
  try {
    const docRef = await addDoc(collection(db, "CocktailDB"), newUser);
    console.log("Doc id: " + docRef.id);
  } catch (e) {
    console.log("Error adding to db: ", e);
  }
}

function loginUser() {
  let email = $("#email").val();
  let password = $("#pw").val();

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredentials) => {
      clearForms();
      updateUserDisplay();
    })
    .catch((e) => {
      console.log("Error Logging in", e.message);
    });
}

function logoutUser(auth) {
  signOut(auth)
    .then(() => {
      globalUser = null; //set current
      updateUserDisplay();
    })
    .catch((e) => {
      console.log("Error signing out: ", e.message);
    });
}

function clearForms() {
  $("#modalBackground").css("display", "none");
  $("#userModal .modalInputs .paramInput").val("");
}

function updateUserDisplay() {
  if (globalUser) {
    //if signed in, display logout button and username
    $("#logout").css("display", "block");
    $("#userWrapper p").html(globalUser.displayName);
  } else {
    //if not signed in, display "sign in" and no log out button
    $("#logout").css("display", "none");
    $("#userWrapper p").html("Sign In");
  }
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
    myFunction;
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
      $.get(`pages/search.html`, function (data) {
        $("#app").html(data);
        search();
      });
      break;
    case "signin":
      // log in
      break;
    case "signout":
      // log out
      break;
    // default:
    //   $.get(`pages/${pageID}.html`, function (data) {
    //     $("#app").html(data);
    //   });
  }
}
