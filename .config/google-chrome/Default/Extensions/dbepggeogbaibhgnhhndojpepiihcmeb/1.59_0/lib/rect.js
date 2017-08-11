// Generated by CoffeeScript 1.11.0
(function() {
  var Rect, root;

  Rect = {
    create: function(x1, y1, x2, y2) {
      return {
        bottom: y2,
        top: y1,
        left: x1,
        right: x2,
        width: x2 - x1,
        height: y2 - y1
      };
    },
    copy: function(rect) {
      return {
        bottom: rect.bottom,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height
      };
    },
    translate: function(rect, x, y) {
      if (x == null) {
        x = 0;
      }
      if (y == null) {
        y = 0;
      }
      return {
        bottom: rect.bottom + y,
        top: rect.top + y,
        left: rect.left + x,
        right: rect.right + x,
        width: rect.width,
        height: rect.height
      };
    },
    subtract: function(rect1, rect2) {
      var rects;
      rect2 = this.create(Math.max(rect1.left, rect2.left), Math.max(rect1.top, rect2.top), Math.min(rect1.right, rect2.right), Math.min(rect1.bottom, rect2.bottom));
      if (rect2.width < 0 || rect2.height < 0) {
        return [Rect.copy(rect1)];
      }
      rects = [this.create(rect1.left, rect1.top, rect2.left, rect2.top), this.create(rect2.left, rect1.top, rect2.right, rect2.top), this.create(rect2.right, rect1.top, rect1.right, rect2.top), this.create(rect1.left, rect2.top, rect2.left, rect2.bottom), this.create(rect2.right, rect2.top, rect1.right, rect2.bottom), this.create(rect1.left, rect2.bottom, rect2.left, rect1.bottom), this.create(rect2.left, rect2.bottom, rect2.right, rect1.bottom), this.create(rect2.right, rect2.bottom, rect1.right, rect1.bottom)];
      return rects.filter(function(rect) {
        return rect.height > 0 && rect.width > 0;
      });
    },
    contains: function(rect1, rect2) {
      return rect1.right > rect2.left && rect1.left < rect2.right && rect1.bottom > rect2.top && rect1.top < rect2.bottom;
    },
    equals: function(rect1, rect2) {
      var i, len, property, ref;
      ref = ["top", "bottom", "left", "right", "width", "height"];
      for (i = 0, len = ref.length; i < len; i++) {
        property = ref[i];
        if (rect1[property] !== rect2[property]) {
          return false;
        }
      }
      return true;
    },
    intersect: function(rect1, rect2) {
      return this.create(Math.max(rect1.left, rect2.left), Math.max(rect1.top, rect2.top), Math.min(rect1.right, rect2.right), Math.min(rect1.bottom, rect2.bottom));
    },
    rectsOverlap: (function() {
      var halfOverlapChecker;
      halfOverlapChecker = function(rect1, rect2) {
        var ref, ref1, ref2, ref3;
        return ((rect1.left <= (ref = rect2.left) && ref <= rect1.right) || (rect1.left <= (ref1 = rect2.right) && ref1 <= rect1.right)) && ((rect1.top <= (ref2 = rect2.top) && ref2 <= rect1.bottom) || (rect1.top <= (ref3 = rect2.bottom) && ref3 <= rect1.bottom));
      };
      return function(rect1, rect2) {
        return halfOverlapChecker(rect1, rect2) || halfOverlapChecker(rect2, rect1);
      };
    })()
  };

  root = typeof exports !== "undefined" && exports !== null ? exports : window;

  root.Rect = Rect;

}).call(this);
