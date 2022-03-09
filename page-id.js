var LAYER_NAME = "PAGE-ID";
var FRAME_LABEL = "page-id";

var textBox = {
  x: 10,
  y: 10,
  width: 70,
  height: 15,
  pointSize: 6,
};

var ProgressBar = function (/*str*/ title) {
  var w = new Window("palette", " " + title, {
      x: 0,
      y: 0,
      width: 340,
      height: 60,
    }),
    pb = w.add("progressbar", { x: 20, y: 12, width: 300, height: 12 }, 0, 100),
    st = w.add("statictext", { x: 10, y: 36, width: 320, height: 20 }, "");
  st.justify = "center";
  w.center();
  this.reset = function (msg, maxValue) {
    st.text = msg;
    pb.value = 0;
    pb.maxvalue = maxValue || 0;
    pb.visible = !!maxValue;
    w.show();
  };
  this.hit = function () {
    ++pb.value;
  };
  this.hide = function () {
    w.hide();
  };
  this.close = function () {
    w.close();
  };
};

try {
  Object.defineProperty({}, "a", { value: 0 });
} catch (err) {
  // failed: so we're in IE8
  (function () {
    var defineProperty = Object.defineProperty;
    Object.defineProperty = function (object, property, descriptor) {
      delete descriptor.configurable;
      delete descriptor.enumerable;
      delete descriptor.writable;
      try {
        return defineProperty(object, property, descriptor);
      } catch (err) {
        object[property] = descriptor.value;
      }
    };
  })();
}

Object.defineProperties ||
  (Object.defineProperties = function defineProperties(object, descriptors) {
    var property;
    for (property in descriptors) {
      Object.defineProperty(object, property, descriptors[property]);
    }
    return object;
  });

if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, "startsWith", {
    value: function (search, rawPos) {
      var pos = rawPos > 0 ? rawPos | 0 : 0;
      return this.substring(pos, pos + search.length) === search;
    },
  });
}

if (!String.prototype.trim) {
  (function () {
    // Make sure we trim BOM and NBSP
    var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
    String.prototype.trim = function () {
      return this.replace(rtrim, "");
    };
  })();
}

Array.prototype.find =
  Array.prototype.find ||
  function (callback) {
    if (this === null) {
      throw new TypeError("Array.prototype.find called on null or undefined");
    } else if (typeof callback !== "function") {
      throw new TypeError("callback must be a function");
    }
    var list = Object(this);
    // Makes sures is always has an positive integer as length.
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    for (var i = 0; i < length; i++) {
      var element = list[i];
      if (callback.call(thisArg, element, i, list)) {
        return element;
      }
    }
  };

function getUID(len) {
  var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    out = "";

  for (var i = 0, clen = chars.length; i < len; i++) {
    out += chars.substr(0 | (Math.random() * clen), 1);
  }

  return out;
}

function keys(obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }
  return keys;
}

function getByLabel(page, label) {
  for (var i = 0; i < page.allPageItems.length; i++) {
    if (page.allPageItems[i].label === label) {
      return page.allPageItems[i];
    }
  }
}

function createIDTextFrame(_ref) {
  var page = _ref.page,
    layer = _ref.layer,
    font = _ref.font;
  var id = getUID(6);
  textframe = page.textFrames.add({
    itemLayer: layer,
    geometricBounds: [
      textBox.y,
      textBox.x,
      textBox.y + textBox.height,
      textBox.x + textBox.width,
    ],
    contents: "ID:".concat(id, ":ID"),
    label: FRAME_LABEL,
  });

  // set font
  if (font) {
    var myParagraph = textframe.paragraphs.item(0);
    myParagraph.appliedFont = font;
    myParagraph.pointSize = textBox.pointSize;
  }

  return id;
}

function run() {
  var doc = null;

  try {
    doc = app.activeDocument;
  } catch (e) {
    // oh oh no active doc
    alert("!You have no document open!\n" + e);
    return;
  }

  var layer = doc.layers.itemByName(LAYER_NAME);

  if (!layer.isValid) {
    var layer = doc.layers
      .add({ name: LAYER_NAME, layerColor: UIColors.RED })
      .move(LocationOptions.AT_BEGINNING);
  }
  layer.locked = false;

  var myFonts = app.fonts.everyItem().getElements();
  var myFontStyles = myFonts.find(function (font) {
    return font.name.startsWith("Myriad");
  });
  var pages = doc.pages;

  var ids = [];

  var pBar = new ProgressBar("Adding ID's");
  pBar.reset("Process pages...", pages.length);

  for (var p = 0; p < pages.length; p++) {
    pBar.hit();
    myPage = doc.pages[p];

    var textframe = getByLabel(myPage, FRAME_LABEL);
    var id = null;

    if (!textframe) {
      id = createIDTextFrame({
        page: myPage,
        layer: layer,
        font: myFontStyles,
      });
    } else {
      var regexpID = /ID:([a-zA-Z0-9]+):ID/;
      var text = textframe.contents;

      if (regexpID.test(text)) {
        id = text.match(regexpID)[1].trim();
      }

      if (
        !id ||
        ids.find(function (item) {
          return item === id;
        })
      ) {
        textframe.remove();
        id = createIDTextFrame({
          page: myPage,
          layer: layer,
          font: myFontStyles,
        });
      }
    }

    ids.push(id);
  }
  pBar.close();

  var docRef = app.activeDocument;
  var win = new Window("dialog", "Page order");

  var input = win.add(
    "edittext",
    [0, 0, 300, 400],
    "--START--\n".concat(ids.join("\n"), "\n--END--\n"),
    {
      multiline: true,
      wantReturn: true,
    }
  );
  input.active = true;
  var go = win.add("button", undefined, "Close");

  go.onClick = function () {
    win.close();
  };
  win.show();
}

try {
  run();
} catch (e) {
  // oh oh
  alert("ERROR\n" + e);
}
