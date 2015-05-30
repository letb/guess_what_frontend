define([
  'app',
  'backbone',
  'tmpl/game',
  'models/points',
  'api/socket'
], function (app, Backbone, tmpl, CanvasModel, socket) {

  var CanvasView = Backbone.View.extend({
    model: canvasModel = new CanvasModel(),

    initialize: function() {
      this.$el.append('<canvas class="canvas"></canvas>');
      this.canvas = this.$('.canvas')[0];
      this.context = this.canvas.getContext('2d');
      this.paint = false;
      this.color = "#f11b1b";
      this.xSpeed = 0;
      this.ySpeed = 0;
      this.xCur = this.canvas.width / 2;
      this.yCur = this.canvas.height / 2;
      this.counter = 0;

      HTMLCanvasElement.prototype.relMouseCoords = this.relMouseCoords;

      $(window).on("resize", _.bind(this.resize, this));
      this.once('render', this.resize, this);
    },

    events: {
      'mousedown .canvas': 'mouseDown',
      'mousemove .canvas': 'mouseMove',
      'mouseup .canvas': 'mouseUp',
      'mouseleave .canvas': 'mouseLeave',

      'touchstart .canvas': 'mouseDown',
      'touchmove .canvas': 'mouseMove',
      'touchend .canvas': 'mouseUp',

      'resized .canvas': 'resize'
    },

    backToCenter: function(e) {
      this.xCur = this.canvas.width / 2;
      this.yCur = this.canvas.height / 2;
      var point = { x: this.xCur,
                    y: this.yCur,
                    drag: false,
                    color: this.color };
      canvasModel.addPoint(point);
      this.xSpeed = 0;
      this.ySpeed = 0;
    },

    motion: function(e) {
      if (Math.abs(e.acceleration.x) < 0.01 || Math.abs(e.acceleration.z) < 0.01) {
        this.xSpeed = 0;
        this.ySpeed = 0;
      }

      this.xSpeed = this.xSpeed + e.acceleration.x * e.interval * 200;
      this.ySpeed = this.ySpeed + e.acceleration.z * e.interval * 200;
      this.xCur = this.xCur + this.xSpeed * e.interval;
      this.yCur = this.yCur + this.ySpeed * e.interval;

      if( this.xCur < 0 ){
        this.xCur = 0;
        this.xSpeed = 0;
      }
      if( this.xCur > this.canvas.width ){
        this.xCur = this.canvas.width;
        this.xSpeed = 0;
      }
      if( this.yCur < 0 ){
        this.yCur = 0;
        this.ySpeed = 0;
      }
      if( this.yCur > this.canvas.height ){
        this.yCur = this.canvas.height;
        this.ySpeed = 0;
      }

      if (this.counter%5 === 0) {
        var point = { x: this.xCur,
                      y: this.yCur,
                      drag: true,
                      color: '#'+Math.floor(Math.random()*16777215).toString(16) // random color
                    };
        canvasModel.addPoint(point); // send ws message here
      } else {
        this.counter += 1;
      }
    },

    render: function() {
      if(window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', this.motion.bind(this));
        window.addEventListener('touchstart', this.backToCenter);
      } else {
        console.log( 'Your device does not support devicemotion' );
      }

      this.redraw(this.canvas, this.context);
      // if (app.session.user.isLeader()) {
        this.delegateEvents();
      // } else {
      //   this.undelegateEvents();
        this.listenTo(app.wsEventBus, 'ws:canvas', this.wsRedraw);
        this.listenTo(app.wsEventBus, 'ws:canvas:clear', this.wsClear);
      // }
      this.trigger('render');
      return this;
    },

    changeSize: function() {
      this.canvas.width = this.canvas.parentElement.offsetWidth;
      this.canvas.height = this.canvas.parentElement.offsetHeight;
      this.xCur = this.canvas.width / 2;
      this.yCur = this.canvas.height / 2;
    },

    resize: function() {
      this.changeSize();
      this.render();
    },

    mouseDown: function(e) {
      e.preventDefault();
      var coord = this.relMouseCoords(e);
      this.paint = true;
      var point = { x: coord.x, y: coord.y, drag: false, color: this.color }
      canvasModel.addPoint(point);
      this.redraw(this.canvas, this.context);
    },

    mouseMove: function(e) {
      e.preventDefault();
      var coord = this.relMouseCoords(e);
      if (this.paint) {
        var point = { x: coord.x, y: coord.y, drag: true, color: this.color }
        canvasModel.addPoint(point);
        this.redraw(this.canvas, this.context);
      }
    },

    mouseUp: function(e) {
      e.preventDefault();
      if (this.paint) {
        localStorage.setItem("canvas", JSON.stringify(canvasModel));
        this.paint = false;
      }
    },

    mouseLeave: function(e) {
      e.preventDefault();
      if (this.paint) {
        this.paint = false;
      }
    },

    changeColor: function(e) {
      var color = $(e.target).css("background-color");
      this.color = this.rgb2hex(color);
    },

    clear: function(e) {
      localStorage.removeItem("canvas");
      canvasModel.clear();
      this.redraw(this.canvas, this.context);
    },

    loadCanvas: function() {
      var data = JSON.parse(localStorage.getItem("canvas"));
      canvasModel = new CanvasModel(data);
    },

    wsClear: function() {
      localStorage.removeItem("canvas");
      canvasModel.clear(true);
      this.redraw(this.canvas, this.context);
    },

    wsRedraw: function(point) {
      canvasModel.addPoint(point, true);
      this.redraw(this.canvas, this.context);
    },

    redraw: function(canvas, context) {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      context.strokeStyle = this.color;
      context.lineJoin = "round";
      context.lineWidth = 5;

      for (var i = 0; i <= canvasModel.pointsCount(); i++) {
        context.strokeStyle = canvasModel.getColor(i);
        context.beginPath();
        if (canvasModel.isDragged(i) && i) {
          context.moveTo(canvasModel.getX(i - 1), canvasModel.getY(i - 1));
        } else {
          context.moveTo(canvasModel.getX(i) - 1, canvasModel.getY(i));
        }
        context.lineTo(canvasModel.getX(i), canvasModel.getY(i));
        context.closePath();
        context.stroke();
      };
    },

    show: function() {
      this.$el.show();
    },

    hide: function() {
      this.$el.hide();
    },

    remove: function() {
      // unbind the namespaced event (to prevent accidentally unbinding some
      // other resize events from other code in your app
      $(window).off("resize");

      // don't forget to call the original remove() function
      Backbone.View.prototype.remove.call(this);
    },

    isTouchEvent: function(event) {
      return event instanceof TouchEvent;
    },

    relMouseCoords: function(event) {
      event = event.originalEvent;
      if (this.isTouchEvent(event))
        event = event.touches[0];

      var canoffset = $('.canvas').offset();
      canvasx = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - Math.floor(canoffset.left);
      canvasy = event.clientY + document.body.scrollTop + document.documentElement.scrollTop - Math.floor(canoffset.top) + 1;
      return {x: canvasx, y: canvasy};
    },

    rgb2hex: function(rgb) {
      var hexDigits = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"];
      rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
      function hex(x) {
        return isNaN(x) ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x % 16];
      }
      return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
    }
  });

  return CanvasView;
});