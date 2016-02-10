var app = app || {};
app.editors = {};
app.editor_id = 0;
app.expiries = [ "Change expiry", "Never", "1 minute", "10 minutes", "1 hour", "1 day", "1 week" ];
app.gridster_base_width = 160;
app.gridster_base_height = 160;

_.templateSettings = {
 evaluate : /\{\[([\s\S]+?)\]\}/g,     // {[ console.log("Hello"); ]} - runs
 interpolate : /\{\{([\s\S]+?)\}\}/g   // {{ key }} - interpolates
};

var createUIElement = function(an_element_id) {
  var templateArgs;
  console.log('typeof ', an_element_id);
  if (typeof an_element_id === 'number') {
    templateArgs = { element_id: an_element_id };
  } else {
    templateArgs = { element_id: '' };
  }
  console.log('create code elt with elt id ', an_element_id);
  var $codeElement = $( app.codeTemplater( templateArgs ) );

  // add another widget
  app.gridster.add_widget( $('<div>').addClass('widget').append( $codeElement ), 3, 1);
  // $('body').append( $codeElement );

  // create a new editor and configure it
  var editor = CodeMirror(function (editor) {
      console.log('editor', editor);
      $codeElement.append( editor ); // add code editor to template
    }, {
      value: '// your code here',
      tabSize: 2,
      lineNumbers: true
  });
  editor.setSize('100%', '100%');
  var new_editor_id = generateEditorId();
  $codeElement.data('editor-id', new_editor_id);
  app.editors[new_editor_id] = editor;
  return $codeElement;
};

var generateEditorId = function() {
  return app.editor_id++;
}

var createUpdateElement = function () {
    var $saveButton = $( this );
    $saveButton.prop('disabled', true);
    $saveButton.siblings('.status').text('Saving...');
    var $codeElement = $( this ).closest('.code');
    var url = '/elements';
    var editor_id = $codeElement.data('editor-id');
    var code = {
      element: {
        title: 'new element',
        page_id: getPageID(),
        content: app.editors[editor_id].getValue(),
        link: 'www.google.com',
        pos_x: 1,
        pos_y: 2,
        width: 500,
        height: 100
      }
    };

    var methodType, url;
    var elt_id = $codeElement.data('element-id'); // element id that identifies an element in rails
    console.log(elt_id);
    if ( elt_id ) { // element id exists so update an existing element in rails
      methodType = 'put';
      url = '/elements/' + elt_id;
    } else { // element id doesn't exist so create a new element in rails
      methodType = 'post';
      url = '/elements';
    }

    $.ajax(url, {
      method: methodType,
      dataType: 'json',
      data: code
    }).done(function( response ){
      console.log('saved. codeElement', $codeElement, response.id);
      $codeElement.data('element-id', response.id);

      $saveButton.siblings('.status').text("Last updated: " + moment().format('h:mm:ss a') );
    }).fail(function(){
      $saveButton.siblings('.status').text("Something went wrong, try again.");
    }).always(function() {
      $saveButton.prop('disabled', false);
    });
};

var deleteElement = function() {
  console.log('delete element', this);
  var $codeElement = $( this ).closest('.code');
  var $widget = $codeElement.parent('div');
  var editor_id = $codeElement.data('editor-id');
  var elt_id = $codeElement.data('element-id');
  var url = '/elements/' + elt_id;
  if (elt_id){ // element id exists so destroy element in rails
    $.ajax(url, {
      method: 'delete',
      dataType: 'json'
    }).done(function() {
      console.log('element destroyed. editor_id ', editor_id);
      // $codeElement.remove();
      delete app.editors[editor_id];
      app.gridster.remove_widget( $widget );
    }).fail(function() {
      $codeElement.find('.status').text('Something went wrong. Try again');
    });
  } else { // element doesn't exist on server so just remove the gui element
    // $codeElement.remove();
    delete app.editors[editor_id];
    app.gridster.remove_widget( $widget );
  }
};

var changeLanguageOrTheme = function(event) {
  console.log('select changed');
  var $codeElement = $( this ).closest('.code');
  var editor_id = $codeElement.data('editor-id');
  var setting = $(this).attr('id');
  var settingVal = $(this).val();
  if ( setting === 'theme' ) {
    app.editors[editor_id].setOption('theme', settingVal );
  } else if ( setting === 'language') {
    app.editors[editor_id].setOption('mode', settingVal );
  }
};

var changeFontSize = function() {
  var $codeElement = $( this ).closest('.code');
  var editor_id = $codeElement.data('editor-id');
  var cur_size = parseInt( $codeElement.find('.CodeMirror').css('font-size') );
  if ( $(this).text() === '+' ) {
  console.log('font size inc', cur_size);
    $codeElement.find('.CodeMirror').css('font-size', (cur_size + 2) + 'px');
  } else {
    console.log('dec size');
    $codeElement.find('.CodeMirror').css('font-size', (cur_size - 2) + 'px');
  }
  app.editors[editor_id].refresh(); // update editor so cursor aligns with font resizing
};

var updateExpiry = function() {
  var selected = $( this ).find('option:selected').text();
  console.log('expiry selected ', selected );
  console.log('expiry time changed to ', app.expiries[selected]);
  var expiry_time;
  switch(selected){
    case "Never":
      console.log('set expiry to nil');
      expiry_time = "";
      break;
    case "1 minute":
      expiry_time = moment().add(1, 'minutes').format();
      break;
    case "10 minutes":
      expiry_time = moment().add(10, 'minutes').format();
      break;
    case "1 hour":
      expiry_time = moment().add(1, 'hours').format();
      break;
    case "1 day":
      expiry_time = moment().add(1, 'days').format();
      break;
    case "1 week":
      expiry_time = moment().add(1, 'weeks').format();
      break;
    default: // 'Change expiry'
      return;
  }

  $.ajax('/pages/' + getPageID(), {
    method: 'put',
    dataType: 'json',
    data: {
      page: {
        expiry: expiry_time
      }
    }
  }).done(function() {
    $('#expiry-status').text('Page expires: ' + addExpiryCountdown(expiry_time) );
  }).fail(function() {
    $('#expiry-status').remove(); // countdown is auto removed too
    $('<span>').attr('id', 'expiry-status').text('Something went wrong. Try again').insertAfter('#expiry');
  });
};

var timeFromNow = function(expiry_time) {
  var expiry;
  if ( expiry_time ) {
    expiry = moment( expiry_time ).fromNow();
  } else {
    expiry = 'never';
  }
  return expiry;
};

var addExpiryCountdown = function(expiry_time) {
  if ( expiry_time ) {
    $("#expiry-status")
      .countdown(moment(expiry_time).toDate(), function(event) {
        var ftime = "Page expires:";
        if ( !!event.offset.totalDays ) { ftime += " %-D day%!D"; }
        if ( !!event.offset.hours ) { ftime += " %-H hr%!H"}
        ftime += " %-M min %-S sec";
        // if ( !!event.offset.minutes ) { ftime += " %M min"}
        // if ( !!event.offset.seconds ) { ftime += " %S sec"}
        $(this).text( event.strftime(ftime) );
    }).on('finish.countdown', function(event) {
      $(this).text('Page expired!');
    });
  } else {
      $('#expiry-status').remove(); // countdown is auto removed too
      $('<span>').attr('id', 'expiry-status').text('Page expires: never').insertAfter('#expiry');
  }
};

var getPageID = function() {
  var path_match = location.href.match( /pages\/(\d+)$/ );
  return path_match[1];
};

$(document).ready(function() {
  console.log('running js');

  // set up gridster and store it as a global instance
  app.gridster = $(".gridster").gridster({
      widget_selector: 'div',
      widget_margins: [2, 2],
      widget_base_dimensions: [app.gridster_base_width, app.gridster_base_height],
      draggable: {
        handle: '.widget'
      },
      resize: {
        enabled: true,
        min_size: [3, 1],
        stop: function(e, ui, $widget) {
          console.log('e', e);
          console.log('ui', ui);
          console.log('$widget', $widget);
          // debugger
          // refreshes the editor so the gutter flows all the way down the editor
          app.editors[ $widget.find('.code').data('editor-id') ].refresh();
        }
      },
      serialize_params: function ($w, wgd) {
        console.log('grid widget, ', $w.text());
        return {
          pos_x: wgd.col,
          pos_y: wgd.row,
          width: wgd.size_x,
          height: wgd.size_y
        };
      }
  }).data('gridster');

  // remove widget
  // gridster.remove_widget( $('.gridster div').eq(3) );

  var gridArr = app.gridster.serialize();
  console.log('grid array', gridArr);

  // populate expiry select input
  console.log('expiry ' + JSON.stringify(app.expiries) );
  app.expiries.forEach( function( label ){
    $('select#expiry').append( $('<option>').text(label) );
  });

  //update expiry time when user changes select input
  $('select#expiry').on('change', updateExpiry);

  // get code element template
  app.codeTemplater = _.template( $('#codeTemplate').html() );

  // get all elements for this page
  $.getJSON('/pages/' + getPageID()).done( function (data) {
    console.log('data for page');
    addExpiryCountdown(data.expiry);
    data.elements.forEach( function(elt) {
      console.log(elt.title, elt.content);
      var $codeElement = createUIElement(elt.id);

      $.getJSON('/elements/' + elt.id).done( function (data) {
        var editor_id = $codeElement.data('editor-id');
        app.editors[editor_id].setValue(elt.content);
        // debugger
        // $codeElement.parent('div').data('sizey') * app.grid_base_size
        app.editors[editor_id].setSize('100%', '100%');
      });
    });
  });


  $('.add-code').on('click', createUIElement);

  // when user types in editor, fire event
  // CodeMirrorInstance.on('changes', function(instance, changes){
  //   console.log('editor changed', instance.getWrapperElement().parentNode);
  // });

  // when a font size button is pressed, increase/decrease font size
  $('body').on('click', '.code .font-size', changeFontSize);

  // when a theme or language is selected, update the editor
  console.log('modes', CodeMirror.modes, CodeMirror.mimeModes);
  $('body').on('change', '.code select', changeLanguageOrTheme);

  // send an AJAX POST request to create/update a new element
  $('body').on('click', '.code .save', createUpdateElement);

  $('body').on('click', '.code .delete', deleteElement);


});