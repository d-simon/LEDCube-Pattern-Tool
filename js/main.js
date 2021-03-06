/**
* The index (starting at 0) of the currently-selected frame.
* @type {number}
*/
var currentFrame = 0;

/**
* Indicates if we are in playback or edit mode.
* @type {boolean}
*/
var inEditMode = true;

/**
* Cached selector for the frame list container.
* @type {jQuery.Selector}
*/
var lstFrames;

/**
* Cached selector for the frame list radio button.
* @type {jQuery.Selector}
*/     
var radFrames;

/**
* Cached selector for the frame duration textbox.
* @type {jQuery.Selector}
*/     
var txtDuration;

/**
* Cached selector for the preview dialog.
* @type {jQuery.Selector}
*/     
var dlgPreview;

/**
* Cached selector for the onion-skin option.
* @type {jQuery.Selector}
*/
var chkOnionSkin;

/**
* Cached selectors for each checkbox in the frame. 
* The index of each element corresponds with its
* cell number (starting at 0).
* @type {Array.<jQuery.Selector>}
*/     
var checkboxSelectors = {};

/**
* Cached selectors for each frame button. The index
* of each element corresponds with its frame
* number (starting at 0).
* @type {Array.<jQuery.Selector>}
*/
var frameSelectors = {};

/**
* Canvas element that contains pre-rendered unlit LEDs.
*/     
var cvsCache;

/**
* Stores global state such as all of our animation information.
* @type {ProgData}
*/
var globals;

/**
* Initializes global state for a new animation.
* @param {number} width The cube width.
* @param {number} height The cube height.
* @param {number} depth The cube depth.
*/
function initGlobals(width, height, depth){
// FUTURE: Change when canvas dimensions change
globals = new ProgData(width, height, depth, 220, 200 );
globals.frameCollection[0] = new Frame(globals.cubeWidth, globals.cubeHeight, globals.cubeDepth);
}

/**
* Renders the specified frame to the canvas element.
* @param {number} frameId The ID of the frame, or -1 for precaching the unlit LED canvas.
* @param {boolean} isPreview True if this is a preview (meaning that we don't clear the canvas out).
* @param {string} fillStyle The fill style to use for any rendered dots.
*/
function renderFrame(frameId, isPreview, fillStyle){

// Are we pre-caching the unlit cube?
var preCache = (frameId < 0);

// Skip over this if the preview dialog isn't visible
// as long as we're not precaching
if (preCache || dlgPreview.dialog("isOpen")) {

  // Get our canvas/canvas context.
  var canvas;
  var ctx = null;
  
  if (preCache === true) {
    // If we're in pre-cache mode, we're
    // creating an in-memory canvas
    // and writing all grey LEDs in.
    
    // Create a canvas if we need to,
    // otherwise use the one we already
    // have stored in cvsCache
    if (cvsCache == null) {
      canvas = document.createElement("canvas");
      canvas.height = globals.canvasHeight;
      canvas.width = globals.canvasWidth;
      cvsCache = canvas;
    }
    else {
      canvas = cvsCache;
    }
    
  }
  else {
    // Working with the canvas directly
    // in the page. 
    // jQuery doesn't natively support canvas stuff right now,
    // so we have to use plain 'ol Javascript for manipulating that.
    // Oh well.
    canvas = document.getElementById('cvsPreview');
  }
  
  // Only proceed if we support the canvas tag in our browser
  if (canvas != null && canvas.getContext) {
    ctx = canvas.getContext('2d');
  }
  
  if (ctx != null) {
  
    // Initialize vars
    var canvasX; // Current X pos
    var canvasY; // Current Y pos
    
    // Figure out the radius for the LED.
    // If we're precaching, this will always
    // be unlit, and we'll only render the
    // lit ones in other instances.
    var dotRadius;
    if (preCache === true) {
      dotRadius = 2; // Unlit
    } else {
      dotRadius = 4; // Lit
    }
    
    // Don't clear the canvas if this is a preview
    if (isPreview === false) {
      ctx.clearRect(0, 0, globals.canvasWidth, globals.canvasHeight);
    }
    
    // If we're not in pre-cache or preview mode, render in
    // the precached version of the grey LEDs.
    if (preCache === false && isPreview === false) {
      ctx.drawImage(cvsCache, 0, 0);
    }
    
    var col;
    var row;
    var depth;
    
    // We need to draw back-to-front
    for (depth = globals.cubeDepth - 1; depth >= 0; depth -= 1) {
      for (row = 0; row < globals.cubeHeight; row += 1) {
        
        // The starting Y is going to increase with every iteration
        canvasY = globals.canvasStartY
        
        // Move up based on which depth level we're on.
        canvasY += globals.canvasGridVertSep * (globals.cubeDepth - depth - 1);
        
        // Move up based on which row we're on.
        canvasY += globals.canvasRowSep * row;
        
        // The starting X is going to decrease with every iteration
        canvasX = globals.canvasStartX
        
        // Move right based on which depth level we're on.
        canvasX += globals.canvasGridHorizSep * depth;
        
        for (col = 0; col < globals.cubeWidth; col += 1) {
        
          // Figure out if this sucker is lit.
          var isCurCellLit = false;
          
          // Our current frame isn't going to be defined
          // when we're precaching, so we need to check
          // that first.
          if (preCache === false) {
            var curFrame = globals.frameCollection[frameId];
            isCurCellLit = (curFrame.cells[curFrame.getIndex(col, row, depth)] === 1);
          }
          
          // Only render this if we are
          // either in pre-cache mode, or if
          // the LED is lit.
          if (preCache === true || isCurCellLit === true) {
          
            // At the moment, we have to do each
            // LED as an individual path so that
            // we get the color for each LED right.
            ctx.beginPath();
            
            ctx.fillStyle = fillStyle;
            ctx.arc(canvasX, canvasY, dotRadius, 0, globals.canvasFullCircleRad, false);
            
            // Render the path
            ctx.closePath();
            ctx.fill();
          }
          
          // Push up/right based on our row/column separation.
          canvasX = canvasX + globals.canvasColSep;
          canvasY = canvasY + globals.canvasRowSep;
        }
      }
    }
  }
}
}

/**
* Re-draws the preview canvas with
* frames as appropriate.
*/
function drawPreview() {

// Get next/prev frames
var prevFrameId = getPrevFrame();
var nextFrameId = getNextFrame();

// Render current frame
renderFrame(currentFrame, false, FillStyles.CURRENT_FRAME);

// Only do onion-skinning if we're in edit mode
// and we have it checked
if (inEditMode === true && chkOnionSkin.prop("checked")) {  
    // Onion-skin the previous frame if it's
    // not our current/next frame
    if (prevFrameId != currentFrame && prevFrameId != nextFrameId) {
        renderFrame(prevFrameId, true, FillStyles.PREV_FRAME);
    }
    
    // Onion-skin the next frame if it's
    // not our current frame
    if (nextFrameId != currentFrame) {
        renderFrame(nextFrameId, true, FillStyles.NEXT_FRAME);
    }   
}
}

/**
* Updates the list of frames in the dialog.
*/
function updateFrameList(){
// Set the currentFrame to be within the bounds of the frameCollection
if (currentFrame >= globals.frameCollection.length) {
  currentFrame = globals.frameCollection.length - 1;
}

// Regenerate contents of frame list
var i;
lstFrames.empty();
radFrames = {};

for (i = 0; i < globals.frameCollection.length; i += 1) {

  // Build the radio button for this frame
  var radio = $("<input type='radio' />").attr("name", "radFrames").attr("id", "radFrame" + i).click([i], selFrame).val(i).data("pos", i);
  
  // Cache this selector
  frameSelectors[i] = radio;
  
  // Add a label for the button.
  // This will include mouseover/mouseout
  // events for our preview.
  var radioLabel = $("<label />").attr("for", "radFrame" + i).attr("id", "lblFrame" + i).html(i + 1).mouseover([i], previewFrame).mouseout([i], stopPreviewFrame).data("pos", i);
  lstFrames.append(radio);
  lstFrames.append(radioLabel);
  
}

// Cache radFrames selector
radFrames = $('input[name=radFrames]');

// Make selectable again
lstFrames.buttonset();
}

/**
* Initializes all the input elements (including lights)
* to match whatever frame has currently-been selected.
*/
function loadCurFrame(){

// Select this radio button
radFrames.val(currentFrame);
frameSelectors[currentFrame].prop("checked", true);

// Refresh the UI
$("#lstFrames > input").button("refresh");

// Set state of all the checkboxes 
var i;

for (i = 0; i < globals.frameCollection[currentFrame].cells.length; i += 1) {
  if (globals.frameCollection[currentFrame].cells[i] === 1) {
    // Set as checked, and display as such
    checkboxSelectors[i].prop("checked", true);
  }
  else {
    // Not checked, so set that
    checkboxSelectors[i].prop("checked", false);
  }
  
  // State probably changed, so refresh
  checkboxSelectors[i].button("refresh");
}

// Make sure we've scrolled to this frame.
lstFrames.scrollLeft(
  $("#lblFrame" + currentFrame).offset().left - lstFrames.offset().left + lstFrames.scrollLeft()
);

// Re-draw the preview.
drawPreview();

// Set duration value for textbox
txtDuration.val(globals.frameCollection[currentFrame].duration);
}

/**
* Previews a frame on mouseover.
* @param {jQuery.Event} event The event object. The frame ID should be the first element in the data collection.
*/
function previewFrame(event){
// Don't show mouseover preview in edit mode
if (inEditMode === false) {
  return;
}

var frameId = event.data[0];

// Don't update the canvas if we're
// trying to preview the current frame.
if (frameId != currentFrame) {
  renderFrame(frameId, true, FillStyles.MOUSEOVER_FRAME);
}
}

/**
* Clears a preview of a frame on mouseout.
* @param {jQuery.Event} event The event object. The frame ID should be the first element in the data collection.
*/
function stopPreviewFrame(event){
// Don't clear mouseover preview in edit mode
if (inEditMode === false) {
  return;
}

var frameId = event.data[0];

// Don't re-draw the canvas if we're
// clearing the preview of the current frame.
if (frameId != currentFrame) {
    // Re-draw the preview.
    drawPreview();
}
}

/**
* Selects a frame.
* @param {jQuery.Event} event The event object. The frame ID should be the first element in the data collection.
*/
function selFrame(event){
currentFrame = event.data[0];
loadCurFrame();
}

/**
* Advances the current frame in playback mode. Adds
* an event timer to call itself after the current
* frame's duration is up.
*/
function advancePlayback(){
// Only advance frame playback if we're in playback mode
if (inEditMode === false) {
  // Advance the frame
  nextFrame();
  
  // Set the event timer to advance to the next frame 
  setTimeout(advancePlayback, globals.frameCollection[currentFrame].duration);
}
}

/**
* Performs an entire refresh of the UI, to reflect
* that all the input elements may need to be changed
* (especially due to changing dimensions).
*/
function refreshUi(){
// Regenerate the checkbox elements
var i; // X-position
var j; // Y-position
var k; // Z-position
var index = 0;

// Clear contents of divGrid
$("#divGrid").empty();

for (k = 0; k < globals.cubeDepth; k += 1) {

  // Set up our basic grid div
  var gridDiv = $("<div />").attr("id", "grid" + k).attr("class", "gridBlk");
  
  for (j = 0; j < globals.cubeHeight; j += 1) {
  
    // Add div for this row
    var rowDiv = $("<div />").attr("id", 'row' + k + '-' + j);
    
    for (i = 0; i < globals.cubeWidth; i += 1) {
    
      // Add checkbox item for this square
      var squareBtn = $('<input type="checkbox" class="gridSqr" />').attr("id", "chk" + index).click([index], toggleLED);
      
      gridDiv.append(squareBtn);
      
      // Add label for the checkbox item
      var squareLabel = $("<label />").attr("for", "chk" + index).html('<span class="noselect">&nbsp;</span>');
      gridDiv.append(squareLabel);
      
      index += 1; // Increment the index
    }
    
    gridDiv.append(rowDiv);
  }
  
  // Add line break before fill actions
  gridDiv.append("<br />");
  
  // Add grid fill/clear
  var gridOpsDiv = $("<div />");
  
  // Build our fill div/button
  var fillOpDiv = $("<div />").attr("class", "left");
  
  var fillBtn = $("<input type='button' />").attr("id", "btnFill" + k).attr("class", "grdFillBtn").attr("title", "Fill all LEDs in this grid.").click([k, 1], setGrid).val("F");
  
  fillOpDiv.append(fillBtn);
  gridOpsDiv.append(fillOpDiv);
  
  // Build our clear div/button
  var clearOpDiv = $("<div />").attr("class", "right");
  
  var clearBtn = $("<input type='button' />").attr("id", "btnEmpty" + k).attr("class", "grdFillBtn").attr("title", "Clear all LEDs in this grid.").click([k, 0], setGrid).val("E");
  
  clearOpDiv.append(clearBtn);
  gridOpsDiv.append(clearOpDiv);
  
  // Now add the operations div to the grid
  gridDiv.append(gridOpsDiv);
  
  // Add guideline depth text
  var gridGuide = $('<div class="desc" />');
  
  if (k === 0) {
    gridGuide.text("Front");
  }
  else 
    if (k === globals.cubeDepth - 1) {
      gridGuide.text("Back");
    }
    else {
      // HACK: figure out a better way of aligning
      gridGuide.html("&nbsp;");
    }
  
  // Add guide to grid div
  gridDiv.append(gridGuide);
  
  // Add div to DOM
  $("#divGrid").append(gridDiv);
  
}

// Re-cache checkbox selectors
checkboxSelectors = {};
var selectIdx;
for (selectIdx = 0; selectIdx < index; selectIdx += 1) {
  checkboxSelectors[selectIdx] = $("#chk" + selectIdx);
}

// Make jQuery buttons
$(".gridSqr").button();
$(".grdFillBtn").button();

// Create canvas cache - "-1"
// indicates this is a pre-cache.
renderFrame(-1, false, FillStyles.UNLIT);

// Update the frame list
updateFrameList();

// Load current frame
loadCurFrame();
}

/**
* Updates the current setting for onion-skinning
* in the preview.
*/
function updateOnionSkin() {
// Just trigger a redraw of the preview
drawPreview();
}

/**
* Generates table code for the LED cube program's memory.
* @param {boolean} depthBeforeHeight Indicates if depth-height-width or height-depth-width ordering should be used.
*/
function toCode(depthBeforeHeight){
// Close the dialog
$("#dlgGenerateCodeAs").dialog("close");

var codeString = "const imageTab[] PROGMEM = {\n";
var i;

for (i = 0; i < globals.frameCollection.length; i += 1) {
  codeString = codeString + globals.frameCollection[i].toCode(depthBeforeHeight);
}

// Add dummy element at end
codeString = codeString + " ";

// Add 0s for all of the elements.  Assuming that each
// element is going to represent a single row, we know
// that we'll have height*depth elements.
for (i = 0; i < globals.cubeHeight * globals.cubeDepth; i += 1) {
  codeString = codeString + "0, ";
}

// Add closing duration/brackets/etc
codeString = codeString + ",\n};";

// And set for the textarea!
$("#genCode").val(codeString);

// Finally, pop up the dialog
$("#dlgGenerateCode").dialog("open");
}

/**
* Shows the "Save Data" dialog.
*/
function toObj(){
// Since we stored everything as a single object, we just need to serialize this
// to JSON.
var serGlob = JSON.stringify(globals);

// Set for the textarea
$("#genObj").val(serGlob);

// Finally, pop up dialog
$("#dlgGenerateObj").dialog("open");
}

/**
* Loads in object data from the "Load Data" dialog.
*/
function fromObj(){
// Make sure non-whitespace was provided before doing anything else
if ($.trim($("#loadObj").val()) === "") {
  alert("No object data provided.");
  return;
}

try {
  // Load in from JSON
  globals = JSON.parse($("#loadObj").val());
  
  // We need to re-add in function definitions because the're not stored in JSON
  var i;
  for (i = 0; i < globals.frameCollection.length; i += 1) {
    globals.frameCollection[i].getTimePerLed = Frame.prototype.getTimePerLed;
    globals.frameCollection[i].getMinDuration = Frame.prototype.getMinDuration;
    globals.frameCollection[i].getIndex = Frame.prototype.getIndex;
    globals.frameCollection[i].setCell = Frame.prototype.setCell;
    globals.frameCollection[i].toCode = Frame.prototype.toCode;
  }
  
  // Close the load dialog
  $("#dlgLoadObj").dialog("close");
  
  // Refresh the UI
  refreshUi();
} 
catch (e) {
  alert("An error occurred when attempting to load your data.  Please ensure that it is formatted correctly.");
}

}

/**
* Inserts a frame at the current position.
* @param {boolean} withCopy If true, will copy the currently-selected frame into the new frame.
*/
function insertFrame(withCopy){
// Disable editing in playback mode
if (inEditMode === false) {
  return;
}

// Insert new frame into array
if (currentFrame >= globals.frameCollection.length - 1) {
  // If we're at the very end, just add it on to the array
  globals.frameCollection.push(new Frame(globals.cubeWidth, globals.cubeHeight, globals.cubeDepth));
}
else {
  // Splice new element into array
  globals.frameCollection.splice(currentFrame + 1, 0, new Frame(globals.cubeWidth, globals.cubeHeight, globals.cubeDepth));
}

// If we're copying a frame, do that here.
if (withCopy === true && currentFrame < globals.frameCollection.length - 1) {
  // Make a copy of the cells array. Since this is
  // an array of value types slice() will work.
  globals.frameCollection[currentFrame + 1].cells = globals.frameCollection[currentFrame].cells.slice(0);
  globals.frameCollection[currentFrame + 1].duration = globals.frameCollection[currentFrame].duration;
}

// Switch to new frame
currentFrame += 1;

// Refresh current frame and frame list
updateFrameList();
loadCurFrame();
}

/**
* Deletes the currently-selected frame.
*/
function deleteFrame(){
// Disable editing in playback mode
if (inEditMode === false) {
  return;
}

// Disable deleting the last frame
if (globals.frameCollection.length === 1) {
  return;
}

// Remove one element
globals.frameCollection.splice(currentFrame, 1);

// Sanity check.
if (currentFrame >= globals.frameCollection.length) {
  currentFrame = globals.frameCollection.length - 1;
}

// Refresh current frame and frame list
updateFrameList();
loadCurFrame();
}

/**
* Gets the frame before the currently-selected frame.
* @return {number} The previous frame index.
*/
function getPrevFrame() {
var prevFrame = currentFrame - 1;

// Wrap around
if (prevFrame < 0) {
  prevFrame = globals.frameCollection.length - 1;
}

return prevFrame;
}

/**
* Moves to the previous frame.
*/
function prevFrame(){
currentFrame = getPrevFrame();

// Update the UI to match the newly selected frame
loadCurFrame();
}

/**
* Gets the frame after the currently-selected frame.
* @return {number} The next frame index.
*/
function getNextFrame() {
var nextFrame = currentFrame + 1;

// Wrap around
if (nextFrame >= globals.frameCollection.length) {
  nextFrame = 0;
}

return nextFrame;
}

/**
* Moves to the next frame.
*/
function nextFrame(){
currentFrame = getNextFrame();

// Update the UI to match the newly selected frame
loadCurFrame();
}

/**
* Applies a duration change.
*/
function editDuration(){
// Disable editing in playback mode
if (inEditMode === false) {
  return;
}

try {
  // Attempt to parse the duration value
  var durationVal = parseInt(txtDuration.val(), 10);
  var minDuration = globals.frameCollection[currentFrame].getMinDuration();
  
  // Figure out if this duration is too small, and display a message if that's the case
  if (durationVal < minDuration) {
    alert("Your specified duration of " + durationVal + "ms is too small. The minimum requirement is " + minDuration + "ms.");
    return;
  }
  
  // Now set on the frame
  globals.frameCollection[currentFrame].duration = durationVal;
  // Update the UI to match
  txtDuration.val(durationVal);
  
} 
catch (e) {
  alert("There was an error attempting to set this duration.  Make sure you have input the value correctly.");
}
}

/**
* Shows/hides the preview dialog.
*/
function previewToggle(){
if (dlgPreview.dialog("isOpen")) {
  dlgPreview.dialog("close");
}
else {
  dlgPreview.dialog("open");
  drawPreview();
}
}

/**
* Toggles between editing/playback modes.
*/
function playToggle(){
if (inEditMode === true) {
  // Currently editing, begin playback
  inEditMode = false;
  
  // Disable editing fields and other such buttons
  $(".btnDisableOnPlayback").button("disable");
  txtDuration.prop("disabled", true);
  chkOnionSkin.prop("disabled", true);
  
  // Make the playback button say "Pause"
  $("#btnPlay").val("Pause");
  
  // Set the event timer to advance to the next frame 
  setTimeout(advancePlayback, globals.frameCollection[currentFrame].duration);
}
else {
  // Currently in playback mode, go back to edit
  inEditMode = true;
  
  // Re-enable all editing controls
  $(":button").button("enable");
  txtDuration.prop("disabled", false);
  chkOnionSkin.prop("disabled", false);
  
  // Make the playback button say "Play"
  $("#btnPlay").val("Play");
  
  // Re-draw our preview
  drawPreview();
}
}

/**
* Toggles the value of an individual cell.
* @param {jQuery.Event} event The event object. The frame ID should be the first element in the data collection.
*/
function toggleLED(event){

// Get the cell index from the event data.
var i = event.data[0];

// Disable editing in playback mode
if (inEditMode === false) {
  // Make sure the actual input element matches the underlying cell value
  if (globals.frameCollection[currentFrame].cells[i] === 1) {
    checkboxSelectors[i].prop("checked", true);
  }
  else {
    checkboxSelectors[i].prop("checked", false);
  }
  return;
}

if (globals.frameCollection[currentFrame].cells[i] === 1) {
  // Toggling from on to off
  globals.frameCollection[currentFrame].cells[i] = 0;
}
else {
  // Toggling from off to on
  globals.frameCollection[currentFrame].cells[i] = 1;
}

// Re-draw the preview.
drawPreview();
}

/**
* Set all cells in a particular grid (i.e. one depth level) to a certain value.
* @param {jQuery.Event} event The event object. The depth level should be the first element in the data collection. The value to use should be the second element.
*/
function setGrid(event){
// Disable editing in playback mode
if (inEditMode === false) {
  return;
}

// Get grid number and value to fill
// the grid with from the event data
var grid = event.data[0];
var val = event.data[1];

var i;

// We're only setting one grid (i.e. one particular depth level), so let's find
// the range in the array that corresponds with it
var gridDim = (globals.frameCollection[currentFrame].height * globals.frameCollection[currentFrame].width);
var minIndex = grid * gridDim;
var maxIndex = minIndex + gridDim;

for (i = minIndex; i < maxIndex; i += 1) {
  globals.frameCollection[currentFrame].cells[i] = val;
}

// Refresh the UI elements
loadCurFrame();
}

/**
* Sets all cells in the current frame to a certain value.
* @param {number} val The new cell value.
*/
function setFrame(val){
// Disable editing in playback mode
if (inEditMode === false) {
  return;
}

var i;

for (i = 0; i < globals.frameCollection[currentFrame].cells.length; i += 1) {
  globals.frameCollection[currentFrame].cells[i] = val;
}

// Refresh the UI elements
loadCurFrame();
}

/**
* Shows a given dialog.
* @param {String} dialog The dialog ID.
*/
function showDlg(dialog){
$("#" + dialog).dialog("open");
}

/**
* Shows a given menu.
* @param {String} menu The menu ID.
*/
function showMenu(menu){
// Only proceed if the menu isn't already being shown
if ($("#" + menu).is(':visible') === false) {
  $(".submenu").css("display", "none");
  $("#" + menu).css("display", "inline");
}
else {
  // Treat as a toggle and hide
  $("#" + menu).css("display", "none");
}
}

/**
* Creates a new animation.
*/
function createNew(){
var width = parseInt($("#txtWidth").val(), 10);
var height = parseInt($("#txtHeight").val(), 10);
var depth = parseInt($("#txtDepth").val(), 10);

// Sanity check.
if (width < 1 || height < 1 || depth < 1) {
  alert("All dimensions must be at least 1 cell in length.");
  return;
}

// Re-init everything
initGlobals(width, height, depth);
refreshUi();

// Close the dialog
$("#dlgNew").dialog("close");
}

$(function(){

// Change the no JS warning to say "Loading..."
$("#divWarning").html("Loading...");

// Cache selectors
lstFrames = $("#lstFrames");
dlgPreview = $("#dlgPreview");
txtDuration = $("#txtDuration");
chkOnionSkin = $("#chkOnionSkin");

// Initialize buttons
$(":button").button();

// Create the generate dialog, and make modal
$("#dlgGenerateCode").dialog({
  title: 'Generated Code',
  width: 500,
  height: 300,
  resizable: false,
  position: ['center', 'middle'],
  modal: true,
  autoOpen: false
});

// Create the generate as (i.e. the code format) dialog, and make modal
$("#dlgGenerateCodeAs").dialog({
  title: 'Choose Code Format',
  width: 500,
  height: 300,
  resizable: false,
  position: ['center', 'middle'],
  modal: true,
  autoOpen: false
});

// Create the load dialog, and make modal
$("#dlgLoadObj").dialog({
  title: 'Load Data',
  width: 500,
  height: 300,
  resizable: false,
  position: ['center', 'middle'],
  modal: true,
  autoOpen: false
});

// Create the save dialog, and make modal
$("#dlgGenerateObj").dialog({
  title: 'Save Data',
  width: 500,
  height: 300,
  resizable: false,
  position: ['center', 'middle'],
  modal: true,
  autoOpen: false
});

// Create the new dialog, and make modal
$("#dlgNew").dialog({
  title: 'New Animation',
  width: 500,
  height: 300,
  resizable: false,
  position: ['center', 'middle'],
  modal: true,
  autoOpen: false
});

// Create the about dialog, and make modal
$("#dlgAbout").dialog({
  title: 'About',
  width: 500,
  height: 300,
  resizable: false,
  position: ['center', 'middle'],
  modal: true,
  autoOpen: false
});

// Fill in our color explanations
// based on our JS consts.
$("#spnPrevFrameColor").css("background-color", FillStyles.PREV_FRAME_NOALPHA);
$("#spnNextFrameColor").css("background-color", FillStyles.NEXT_FRAME_NOALPHA);
$("#spnMouseoverFrameColor").css("background-color", FillStyles.MOUSEOVER_FRAME_NOALPHA);

// Create the onion-skinning dialog, and make modal
$("#dlgOnionSkinHelp").dialog({
  title: 'Onion-Skinning',
  width: 500,
  height: 400,
  resizable: false,
  position: ['center', 'middle'],
  modal: true,
  autoOpen: false
});     

// Create the frame list dialog, also hiding the close button
$("#dlgFrameList").dialog({
  title: 'Frames',
  width: 700,
  height: 180,
  minHeight: 180,
  minWidth: 550,
  maxHeight: 180,
  position: ['center', 'bottom'],
  closeOnEscape: false,
  open: function(event, ui){
    // Hide the close button
    $(this).parent().children().children('.ui-dialog-titlebar-close').hide();
    // Make sure the entire frame list doesn't scroll -
    // lstFrames will handle all scrolling for us.
    $("#dlgFrameList").css("overflow", "hidden");
  }
});

// Generate the preview dialog
dlgPreview.dialog({
  title: 'Preview',
  width: 280,
  height: 300,
  resizable: false,
  position: ['right', 'top'],
  autoOpen: true
}); 

// Make hitting "enter" when in the duration
// textbox attempt to apply the duration change
txtDuration.keyup(function () {
  if (event.which == 13) {
    editDuration();
    event.preventDefault();
  }
});

// Init data model
initGlobals(3, 3, 3);

// Close warning div
$("#divWarning").hide();

// Show UI
$("#divHasJs").show();

// Finally, refresh the entire UI
refreshUi();

});