import { changeRoute } from "./model.js";

function initURLListener() {
  $(window).on("hashchange", changeRoute);
  changeRoute();
}

$(document).ready(function () {
  $(".searchInput a").on("click", changeRoute);
  initURLListener();
});
