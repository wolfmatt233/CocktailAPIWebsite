// Description: Model does data work for user requests.
// const baseURL = "https://api.api-ninjas.com/v1/cocktail?X-Api-Key=";
// const apiKey = "3qejyl6/TzFQqVdiJQ6oDw==oJFyiwWlxulyGdcw";
const baseURL = "https://www.thecocktaildb.com/api/json/v1/1/"
const searchURL = "search.php?"
const byName = "s="
const byId = "i="
const byFirstLetter = "f="

//---------OTHER---------\\

export function currentPage(pageID) {
  if (pageID == "home" || pageID == "") {
    // index("a");
  }
}


//----------USER----------\\

//Read User to page

//Update User

//Delete User

//Add item to favorites

//Add a review


//----------API----------\\

function index(letter) {
  $("#app").html(`<div class="home"></div>`)
  let byLetterURL = `${baseURL}${searchURL}${byFirstLetter}${letter}`
  let alphabet = [...'abcdefghijklmnopqrstuvwxyz']

  $.getJSON(byLetterURL, (data) => {
    data = data.drinks
    
    data.forEach((drink) => {
      $(".home").append(`
        <a href="#${drink.idDrink}" class="drinkItem">
            <p>${drink.strDrink}</p>
            <img src="${drink.strDrinkThumb}" alt="DrinkImg">
        </a>
      `)
    });
  })

  $("#app").append(`<div class="letterPagination"></div>`)

  alphabet.forEach((letter) => {
    $(".letterPagination").append(`<a href="#letter${letter}}">${letter}</a>`)
  })
}



// let alphabet = [...'zyxwvutsrqponmlkjihgfedcba']
// let allArray = []
// let byLetterURL = `${baseURL}${searchURL}${byFirstLetter}`
// alphabet.forEach((letter) => {
//   let newURL = `${byLetterURL}${letter}` //each drink by letter

//   $.getJSON(newURL, (data) => {
//     data = data.drinks

//     data.forEach((drink) => { //get each drink 
//       allArray.push(drink) //push it to the array
//     })
//   })
// });