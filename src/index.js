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
import * as MODEL from "./model.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const globalUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    const uid = user.uid;
    globalUser = user;
    console.log("Signed in.")
    console.log("User ID: ", uid);
    console.log(globalUser);
  } else {
    // User is signed out
    console.log("You need to sign in.");
  }
});

function initListeners() {
  routes();
  userModal();
}

$(document).ready(function () {
  initListeners();
});

function routes() {
  let hashLocation = window.location.hash;
  let pageID = hashLocation.replace("#", "");

  MODEL.currentPage(pageID);
}

//----------USER----------\\

function userModal() {
  $("#user").on("click", () => {
    if(!globalUser) {
      //listen for create user button
      $("#createAcctBtn").on("click", () => {
        let uName = $("#uNameCreate").val();
        let email = $("#emailCreate").val();
        let pw = $("#pwCreate").val();
    
        createUserWithEmailAndPassword(auth, email, pw)
          .then((userCredentials) => {
            //create document in firestore
            console.log("Created ", userCredentials.user);
          })
          .catch((error) => {
            console.log("Error: ", error.message);
          });
      })

      //listen for login user button
      $("#login").on("click", () => {

      })
    }
  })
}

function viewUser() {
  //get user information from storage to make graphs
}

function updateUser() {
  //username, password, email, bio
}

function deleteUser() {
  //remove document from firestore
}

function addToFavorites() {
  //from details view, add a certain item to a user's favorites
}

function addReview() {
  //from details view, add a review by the user on a certain item
  //review added to separate storage. array of reviews, api item id included
}

//----------API----------\\START HERE

function view() {
  //get specific item from api, display details
  //include review and add to favorites buttons if user is logged in
  //include reviews section: avg star rating and worded reviews
}

function search() {
  //using nav search bar, search for items in the API based on title
}
