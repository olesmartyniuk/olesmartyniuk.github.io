/*
 * Caculate the Timeago
 * v2.0
 * https://github.com/cotes2020/jekyll-theme-chirpy
 * © 2019 Cotes Chung
 * MIT Licensed
 */

$(function () {

  function ukrainianSuffix(value, type) {
    if ([2, 3, 4].includes(value % 10)) {
      switch (type) {
        case "хвилина":
          return "хвилини";
        case "година":
          return "години";
        case "день":
          return "дні";
        case "тиждень":
          return "тижні";
        case "місяць":
          return "місяці";
        case "рік":
          return "роки";
      }
    }

    if ([5, 6, 7, 8, 9, 0].includes(value % 10) || (value > 10 && value < 20)) {
      switch (type) {
        case "хвилина":
          return "хвилин";
        case "година":
          return "годин";
        case "день":
          return "днів";
        case "тиждень":
          return "тижнів";
        case "місяць":
          return "місяців";
        case "рік":
          return "років";
      }
    }

    if ([1].includes(value % 10)) {
      switch (type) {
        case "хвилина":
          return "хвилину";
        case "година":
          return "годину";
        case "день":
          return "день";
        case "тиждень":
          return "тиждень";
        case "місяць":
          return "місяць";
        case "рік":
          return "рік";
      }
    }

    throw "Error in unkrainianSuffix";
  }

  function timeago(date, isLastmod) {
    var now = new Date();
    var past = new Date(date);
    var seconds = Math.floor((now - past) / 1000);

    var year = Math.floor(seconds / 31536000);
    if (year >= 1) {
      return year + " " + ukrainianSuffix(year, "рік") + " тому";
    }

    var month = Math.floor(seconds / 2592000);
    if (month >= 1) {
      return month + " " + ukrainianSuffix(month, "місяць") + " тому";
    }

    var week = Math.floor(seconds / 604800);
    if (week >= 1) {
      return week + " " + ukrainianSuffix(week, "тиждень") + " тому";
    }

    var day = Math.floor(seconds / 86400);
    if (day >= 1) {
      return day + " " + ukrainianSuffix(day, "день") + " тому";
    }

    var hour = Math.floor(seconds / 3600);
    if (hour >= 1) {
      return hour + " " + ukrainianSuffix(hour, "година") + " тому";
    }

    var minute = Math.floor(seconds / 60);
    if (minute >= 1) {
      return minute + " " + ukrainianSuffix(minute, "хвилина") + " тому";
    }

    return (isLastmod ? "щойно" : "Щойно");
  }


  function updateTimeago() {
    $(".timeago").each(function () {
      if ($(this).children("i").length > 0) {
        var isLastmod = $(this).hasClass('lastmod');
        var node = $(this).children("i");
        var date = node.text();   /* ISO Dates: 'YYYY-MM-DDTHH:MM:SSZ' */
        $(this).text(timeago(date, isLastmod));
        $(this).append(node);
      }
    });

    if (vote == 0 && intervalId != undefined) {
      clearInterval(intervalId);  /* stop interval */
    }
    return vote;
  }


  var vote = $(".timeago").length;
  if (vote == 0) {
    return;
  }

  if (updateTimeago() > 0) {      /* run immediately */
    vote = $(".timeago").length;  /* resume */
    var intervalId = setInterval(updateTimeago, 60000); /* loop every minutes */
  }

});