// Generated by CoffeeScript 1.11.0
(function() {
  var $;

  $ = function(id) {
    return document.getElementById(id);
  };

  document.addEventListener("DOMContentLoaded", function() {
    var branchRefRequest;
    $("vimiumVersion").innerText = Utils.getCurrentVersion();
    chrome.storage.local.get("installDate", function(items) {
      return $("installDate").innerText = items.installDate.toString();
    });
    branchRefRequest = new XMLHttpRequest();
    branchRefRequest.addEventListener("load", function() {
      var branchRefParts;
      branchRefParts = branchRefRequest.responseText.split("refs/heads/", 2);
      if (branchRefParts.length === 2) {
        $("branchRef").innerText = branchRefParts[1];
      } else {
        $("branchRef").innerText = "HEAD detatched at " + branchRefParts[0];
      }
      return $("branchRef-wrapper").classList.add("no-hide");
    });
    branchRefRequest.open("GET", chrome.extension.getURL(".git/HEAD"));
    return branchRefRequest.send();
  });

}).call(this);
