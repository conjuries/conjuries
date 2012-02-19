/*
    The routines contained herein are either Copyright 2010 J. R. McCall,
    or have a specific copyright notice within their function closure. All are
    free software, that you may use, modify, and distribute under the terms
    of the GNU General Public License (http://www.gnu.org/licenses/gpl.html)

    http://puffball.org/__GPL__/utils.js

    Perhaps it is not necessary to mention this, but one should not refer to 
    these routines UNTIL THE DOCUMENT IS LOADED.
*/
var j45;
j45 || (j45 = {});
j45.__cUTILS__ = "(C)2010-2012 J.R.McCall";
(function() {
// Assumes NOT Internet Explorer
    'use strict';
    var utils = j45;
/////////// string and String additions /////////////
    if ( !String.prototype.trim ) {
        String.prototype.trim = function () {
            return this.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");
        };
    }
    (String.fromUniCode === undefined) && ( String.fromUniCode = function () {
        //generalizes String.fromCharCode to enstring unicode of any size (e.g. could be > 0xffff)
        //Takes any number of comma-separated codepoints and returns a string
        //Example: String.fromUniCode( 0x1d736, 0x1d737, 0x1d738, 0x20, 0xe2, 0xc6, 0x2135 )
        // (Thanks, mozilla! (and rfc2781))
        var ii, cP,
                argLen = arguments.length,
                retStr = '';
        for ( ii = 0; ii < argLen; ii++ ) {
            var cP = arguments[ii];
            if ( cP > 0xffff ) {
                cP -= 0x10000;
                retStr += String.fromCharCode(  ( 0xd800 | ((cP >>> 10) & 0x3ff) ), ( 0xdc00 | (cP & 0x3ff) ) );
            } else {
                retStr += String.fromCharCode(cP);
            }
        } //for
        return retStr;      
    } );  //fromUniCode
////////////////////// Local Functions ////////////////////////////////////
//////////
    function _uVPOffset( el ) {
    //returns [top, left] of a rendered (tho possibly hidden) element 'el'
    // from viewport's w and h):
    //This takes account of scrolling, but makes the (possibly unwarranted!)
    // assumption that if 'el' or ANY offset-ancestor is 'fixed', then
    // scrolling is not relevant to the final positioning.
        var offTop = 0, offLeft = 0, yScroll = 0, xScroll = 0, isFixed = false,
            myDad = el;
        while ( myDad ) {
            if ( window.getComputedStyle(myDad, null).position == "fixed" ) {
                isFixed = true;
            }
            yScroll += myDad.scrollTop;
            xScroll += myDad.scrollLeft;
            offTop += myDad.offsetTop;
            offLeft += myDad.offsetLeft;
            myDad = myDad.offsetParent;
        }
        //we assume final 'myDad' is the body element, the scrolling for which is not indicated in firefox (it
        //puts it in the body's parent node!), but window.pageX-or-YOffset will do the trick...
        xScroll += (document.body.scrollLeft === 0) ? window.pageXOffset : 0;
        yScroll += (document.body.scrollTop === 0) ? window.pageYOffset : 0;
        if ( !isFixed ) {        
            offTop -= yScroll;
            offLeft -= xScroll;
        }
        return {t:offTop, l:offLeft};
/*
    //this method fails, since it does not take account of "fixed" ancestors...
        var xScroll, yScroll,
            elBox = el.getBoundingClientRect();
        if ( window.getComputedStyle(el, null).position == "fixed" ) {
            xScroll = 0;
            yScroll = 0;
        } else {
            xScroll = window.pageXOffset;
            yScroll = window.pageYOffset;
        }
        return {t:(elBox.top + yScroll), l:(elBox.left + xScroll) };
*/
    } //_uVPOffset
////////////
    function _uSetupBalloon( theTool ) {
    /*
        Build an element that can be made visible on, say, a click or mouseover...
        'theTool' is the element around which the display will hover. Scrollbars are
        taken account of, but perhaps the method is a bit forceful...
        'theTool' must, at the time of function invocation, be rendered (tho it can be
        hidden).

        Requirements: Box should be at least minPix (say, 300) pixels wide. If there is 
        less than the minimum to either side it goes full-viewport (minus the scrollbar-
        space) wide. Likewise, if it CAN go left or right, but is too little top or bottom,
        it goes full height (minus scrollbar space). Normally it will take the widest space
        outward from one of theTool's corners, either to the left or the right,
        from a top or bottom corner as there is more room up or down, resp. 

        Assume scrollbars exist at right and bottom, whether they do or not.
    */
        var cornerWidth, cornerHeight, anchorRight, anchorBottom, boxE, bS,
            minWidth = 400,
            minHeight = 200,
            toolXY = _uVPOffset( theTool ),
            toolT = toolXY.t,
            toolL = toolXY.l,
            toolW = theTool.offsetWidth,
            toolH = theTool.offsetHeight,
            sbW = utils.utSBWidth(),
            sbH = utils.utSBHeight(),
            vpW = utils.utVPWidth(),
            vpH = utils.utVPHeight(),
            rightRoom = vpW - toolL - toolW - sbW,
            bottomRoom = vpH - toolT - toolH - sbH;

        if ( toolL >= rightRoom ) {
            cornerWidth = toolL;
            anchorRight = true;
        } else {
            cornerWidth = rightRoom;
            anchorRight = false;
        }
        if ( toolT >= bottomRoom ) {
            cornerHeight = toolT;
            anchorBottom = true;
        } else {
            cornerHeight = bottomRoom;
            anchorBottom = false;
        }
        if ( cornerWidth < minWidth ) {
            anchorRight = true;
            cornerWidth = vpW - sbW;
        } else {
            if ( cornerHeight < minHeight ) {
                anchorBottom = true;
                cornerHeight = vpH - sbH;
            }
        }
        boxE = document.createElement("div");
        bS = boxE.style;
        bS.position = "fixed";
        if ( anchorRight ) {
            bS.maxWidth = cornerWidth + sbW + "px";
            bS.right = vpW - cornerWidth - sbW + "px";
        } else {
            bS.maxWidth = cornerWidth + "px";
            bS.left = vpW - sbW - cornerWidth + "px";
        }
        if ( anchorBottom ) {
            bS.maxHeight = cornerHeight + sbH + "px";
            bS.bottom = vpH - cornerHeight - sbH + "px";
        } else {
            bS.maxHeight = cornerHeight + "px";
            bS.top = vpH - cornerHeight - sbH + "px";
        }
        return boxE;
    } //_uSetupBalloon    
/////////////////////////////////////////////////////////////////////////
    /* ----------------------------------------------------------------------------------------- */
    utils.utGetElements = function( theClass, theTag, theRoot ) {
    /////////////// Thanks to the 'Rhino' //////////////
        var allTags, ii, currElt, theLen,
            inRoot, inTag,
            clElements = [];
        if (!theRoot) {
            inRoot = document;
        } else {
            if ( typeof theRoot === "string" ) {
                inRoot = document.getElementById(theRoot);
                if ( !inRoot ) {
                    return [];
                }
            } else {
                inRoot = theRoot;
            }
        }
        inTag = (theTag) ? theTag : "*";
        allTags = inRoot.getElementsByTagName(inTag);
        if ( !theClass ) {
            return allTags;
        }
        theLen = allTags.length;
        for ( ii = 0; ii < theLen; ii++ ) {
            currElt = allTags[ii];
            if ( currElt.classList ) {
                if ( currElt.classList.contains(theClass) ) {
                    clElements.push(currElt);
                }
            } else {
                if ( currElt.className === theClass ) {
                    clElements.push(currElt);
                }
            }
        } //for
        return clElements;
    }; //utGetElements
    /* ----------------------------------------------------------------------------------------- */
    utils.utPopnote = function( theBox, displayWin ) {
    //find footnotes in the text, within 'theBox' (element reference); set up
    // to pop them, when requested, where '.ghostFoot' styling places them (relative
    // to the viewport, since position is 'fixed') The window for display is the 
    //'theBox's window, unless a 'displayWin' is supplied.

        var realNote, realAnc, ii, ghostNote,
            _bigWin = (displayWin ? displayWin : theBox.ownerDocument.defaultView),
            dNotes = utils.utGetElements( "aFoot", "*", theBox ),
            theLen = dNotes.length,
            _currentAnchorE = null;
        function _rePad(theGhost) {
            //make sure the note fits on the screen...
            var gnXY = _uVPOffset( theGhost ),
                gnT = gnXY.t,
                gnL = gnXY.l,
                gnW = theGhost.offsetWidth,
                gnH = theGhost.offsetHeight,
                sbW = utils.utSBWidth(),
                sbH = utils.utSBHeight(),
                vpW = utils.utVPWidth(),
                vpH = utils.utVPHeight(),
                rightRoom = vpW - gnL - gnW - sbW,
                bottomRoom = vpH - gnT - gnH - sbH;
            if ( (gnL < 0) || (rightRoom < 0) ) {
                theGhost.style.left = "0";
                theGhost.style.right = "auto";
                theGhost.style.maxWidth = (vpW - sbW) + "px";
            } else {
                theGhost.style.left = "";
                theGhost.style.right = "";
                theGhost.style.maxWidth = "";            
            }
            if ( (gnT < 0) || (bottomRoom < 0) ) {
                theGhost.style.top = "0";
                theGhost.style.bottom = "auto";
                theGhost.style.paddingRight = (sbW + 2) + "px";
                theGhost.style.maxHeight = (vpH - sbH) + "px";
            } else {
                theGhost.style.top = "";
                theGhost.style.bottom = "";
                theGhost.style.paddingRight = "";
                theGhost.style.maxHeight = "";
            }
        } //_rePad
        function _bigFlip( event ) {
        //fires w/click from anywhere in display area...
            var theGhost;
            if ( _currentAnchorE ) {
                _currentAnchorE.j45Ghost.style.visibility = "hidden";
                _currentAnchorE.addEventListener( "click", _flipNote, false );
                _currentAnchorE = null;
            }
            _bigWin.document.removeEventListener( "click", _bigFlip, false );
            if ( _bigWin != window.self ) {
                document.removeEventListener( "click", _bigFlip, false );
            }
            return false;
        }  //_bigFlip
        function _flipNote( event ) {
        //puts the desired note on the pad, and makes it visible
            var theGhost;
            //What if another note is open?
            if ( _currentAnchorE ) {
                _currentAnchorE.j45Ghost.style.visibility = "hidden";
                _currentAnchorE.addEventListener( "click", _flipNote, false );
                _currentAnchorE = null;
                _bigWin.document.removeEventListener( "click", _bigFlip, false );
                if ( _bigWin != window.self ) {
                    document.removeEventListener( "click", _bigFlip, false );
                }
            }
            //
            if ( event.eventPhase == 2 ) {
                _currentAnchorE = event.currentTarget;
                _currentAnchorE.removeEventListener( "click", _flipNote, false );
                _bigWin.document.addEventListener( "click", _bigFlip, false );
                if ( _bigWin != window.self ) {
                    document.addEventListener( "click", _bigFlip, false );
                }
                theGhost = _currentAnchorE.j45Ghost;
                _rePad(theGhost);
                theGhost.style.visibility = "visible";
                event.stopPropagation();
            }
            return false;
        } //_flipNote
        for ( ii = 0; ii < theLen; ii++ ) {
            realAnc = _bigWin.document.createElement("span");
            realAnc.className = "popAnc";
            realAnc.innerHTML = "&#8224;&#160;";
            realNote = dNotes[ii];
            realNote.parentNode.replaceChild( realAnc, realNote );            
            ghostNote = _bigWin.document.createElement( "div" );
            ghostNote.className = "ghostFoot";
            ghostNote.style.visibility = "hidden";
            ghostNote.appendChild( realNote );
            _bigWin.document.body.appendChild( ghostNote );
            realAnc.j45Ghost = ghostNote;
            realAnc.addEventListener( "click", _flipNote, false );
        } //for
    }; //utPopnote
    /* ----------------------------------------------------------------------------------------- */
    var _ENUniquer = 1;
    utils.utEndnote = function( theBox ) {
    //Find endnotes in the text, within 'theBox' (element reference), and set them
    //within a list after 'theBox', numbered, with the anchors at the original location.
        var ii, realNote, ghostNote, theListE, anAncE, anchorName, targetName, newRealE,
            dNotes = utils.utGetElements( "aBack", "*", theBox ),
            theLen = dNotes.length;
        if ( theLen === 0 ) {
            return false;
        }
        theListE = document.createElement("ol");
        theListE.innerHTML = "<div>**Notes**</div>";
        theListE.className = "enoList";
        _ENUniquer += 1;        //unique for this invocation
        for ( ii = 1; ii <= theLen; ii++ ) { 
            anchorName = "endN" + _ENUniquer + "u" + ii + "anc";
            targetName = "endN" + _ENUniquer + "u" + ii + "tgt";
            realNote = dNotes[ii - 1];  //array is 0-based, list is 1-based
            newRealE = document.createElement( "a" );
            newRealE.className = "enoAnc";
            newRealE.id = anchorName;
            newRealE.href = "#" + targetName;
            newRealE.innerHTML = "[" + ii + "]";
            realNote.parentNode.replaceChild( newRealE, realNote );
            ghostNote = document.createElement( "li" );
            ghostNote.className = "enoTgt";
            anAncE = document.createElement( "a" );
            anAncE.id = targetName;
            anAncE.href = "#" + anchorName;
            anAncE.innerHTML = "^&nbsp;";
            ghostNote.appendChild( anAncE );
            ghostNote.appendChild( realNote );
            theListE.appendChild( ghostNote );
        } //for
        theBox.appendChild( theListE );
    }; //utEndnote
    /* ----------------------------------------------------------------------------------------- */
    utils.utScrunch = function ( boxAr, picAr ) {
    //fits the pic (array # of dimensions) into the box (array of same size)
    //returns the contraction factor (<= 1) that each pic dimension must undergo
        var i = boxAr.length - 1;
        var finalScrunch = 1;
        while ( i >= 0 ) {
            var thisScrunch = ( boxAr[i] / picAr[i] );
            finalScrunch = (thisScrunch < finalScrunch) ? thisScrunch : finalScrunch;
            i--;
        }
        return finalScrunch;
    };
    /* ----------------------------------------------------------------------------------------- */
    //The viewport dimensions are of this window's top. It might be an opened, somewhat smaller, window
    //within another. Too bad: same-origin issues can intrude if we go to the very top of all openers...
    utils.utVPWidth = function() {
    //returns width of viewport in pixels
        return top.document.documentElement.clientWidth;
    }; //utVPWidth
    utils.utVPHeight = function() {
    //returns height of viewport in pixels
        return top.document.documentElement.clientHeight;
    }; //utVPHeight
    /* ----------------------------------------------------------------------------------------- */
    (function () {
        //the calculation is not done on document load, as, at doc load, it may be used by something
        // else that runs then, but before this one ran. Thus, it runs, one time, when it is needed.
        //Thereafter, utSBWidth & utSBHeight simply return the once-discovered values.
        var sbWidth, sbHeight;
        function _fillOb() {
            var vpSpanE = document.createElement("div");
            vpSpanE.style.cssText = 
                "position:absolute;visibility:hidden;left:0;top:0;width:50px;height:50px;overflow:scroll;";
            document.body.appendChild( vpSpanE );
            sbWidth = vpSpanE.offsetWidth - vpSpanE.clientWidth;
            sbHeight = vpSpanE.offsetHeight - vpSpanE.clientHeight;
            document.body.removeChild( vpSpanE );
        } //_fillOb
        utils.utSBWidth = function() {    
        //returns the width of a vertical scrollbar in pixels
            if ( sbWidth === undefined ) {
                _fillOb();
            }
            return sbWidth;;
        } //utSBWidth
        utils.utSBHeight = function() {    
        //returns the height of a horizontal scrollbar in pixels
            if ( sbHeight === undefined ) {
                _fillOb();
            }
            return sbHeight;
        } //utSBHeight
    }) ();
    /* ----------------------------------------------------------------------------------------- */
    utils.utShowAndKill = function( theMsg, theCallback ) {
    //creates a div with large z-index for theMsg, gives it a moment, then kills it if the user does anything;
    //optionally invoke a callback function
        var msgDiv;
        function killMsg( e ) {
            document.removeEventListener( "click", killMsg, false );
            document.removeEventListener( "mousemove", killMsg, false );
            document.removeEventListener( "keydown", killMsg, false );
            document.body.removeChild(msgDiv);
            if ( theCallback ) {
                theCallback();
            }
            return false;
        }
        function onOff() {
            document.addEventListener( "click", killMsg, false );
            document.addEventListener( "mousemove", killMsg, false );
            document.addEventListener( "keydown", killMsg, false );
        }
        msgDiv = document.createElement( "div" );
        msgDiv.innerHTML = theMsg;
        msgDiv.style.cssText = "position:fixed;top:100px;left:20%;width:60%;font-size:14pt;line-height:1.2;	font-family:serif;padding:10px;border:thick orange outset;color:#ffff00;text-align:center;background-color:#888844;z-index:2000;";
        document.body.appendChild(msgDiv);
        window.setTimeout( onOff, 1000 );
    }; //utShowAndKill
    /* ----------------------------------------------------------------------------------------- */
    utils.utShowDown = function ( theButton, theHTML, moreStyle ) {
    //shows up when you push down...
        var balloonE,
            styleText = "background:#eeeeee;border:2px black solid;padding:10px;" +
                            "border-radius:10px;overflow:auto;z-index:1000;",
            buttonE = ( typeof theButton == "string" ) ? document.getElementById(theButton) : theButton;
        styleText += moreStyle ? moreStyle : '';

        buttonE.addEventListener( "mouseup", _upShow, false );
        function _upShow( e ) {
        //displays the balloon on mouseup
            function _upGo( e ) {
                if ( (e.type == "keyup") && (e.keyCode != 27) ) {
                    return true;
                }
                buttonE.addEventListener( "mouseup", _upShow, false );
                buttonE.removeEventListener( "mouseup", _upGo, false );
                document.removeEventListener( "keyup", _upGo, false );
                document.body.removeChild( balloonE );
                e.stopPropagation();
                return false;
            }  //_upGo
            balloonE = _uSetupBalloon( buttonE );
            balloonE.style.cssText += styleText + moreStyle;
            buttonE.removeEventListener( "mouseup", _upShow, false );
            buttonE.addEventListener( "mouseup", _upGo, false );
            document.addEventListener( "keyup", _upGo, false );     
            e.stopPropagation();
            balloonE.innerHTML = theHTML;
            document.body.appendChild( balloonE );
            return false;
        }           //_upShow
    };        //utShowDown
    /* ----------------------------------------------------------------------------------------- */
    utils.utGetAndGo = function( theLabel, theName, theCallback, theType ) {
    /*
        'theLabel' will appear in the user-interface box created; 'theName' describes
        it for use in ambiguous returns;
        'theCallback' is a function called as follows: theCallback( theName, the-obtained-value );
        'theType' is 'text' (the default), 'textarea', or 'password';

        Puts up an input box to get a string value. If the box is cancelled, the routine issues
        'theCallback( theName, "__cancelled__" )'. Otherwise, 'theCallback( theName, theString )'.
        (So, of course, "__cancelled__" should never be used as a legitimate return value...)

        No other button events are allowed while the box is up, since the screen
        is covered by a transparent barrier. A click anywhere makes the box (and
        barrier) go away.
    */
        var _iBox, _screenE, _boxE, _inputE, _cancelBE, _submitBE;
        switch (theType) {
            case 'textarea':
                _iBox= '<textarea cols=\"40\" rows=\"4\" id=\"gNgInput\"></textarea>';
                break;
            case 'password':
                _iBox = '<input type=\"password\" id=\"gNgInput\" />';
                break;
            case 'text':
            default:
                _iBox = '<input type=\"input\" id=\"gNgInput\" />';
        } //switch
        var boxHTML = '<div style="text-align:center;font-family:serif;font-size:medium;font-weight:bold;">' +
                                theLabel + '</div>' +
                                '<div style="width:90%;margin:15px;auto;">' + _iBox + '</div>' +
                                '<button type="button" style="clear:both;float:left;" id="gNgCancelB">Cancel</button>' +
                                '<button type="button" style="float:right;" id="gNgSubmitB">Submit</button>' +
                                '<div style="clear:both;"></div>';
        function _cancelIt( e ) {
            document.body.removeEventListener( "click", _cancelIt, false );
            _cancelBE.removeEventListener( "click", _cancelIt, false );
            _submitBE.removeEventListener( "click", _submitIt, false );
            document.body.removeChild(_screenE);
            e.stopPropagation();
            return theCallback( theName, "__cancelled__" );
        } //cancelIt
        function _submitIt( e ) {
            document.body.removeEventListener( "click", _cancelIt, false );
            _cancelBE.removeEventListener( "click", _cancelIt, false );
            _submitBE.removeEventListener( "click", _submitIt, false );
            document.body.removeChild(_screenE);
            e.stopPropagation();
            return theCallback( theName, _inputE.value );
        } //submitIt
        ////////// initial processing ////////
        _screenE = document.createElement("div");
        _screenE.style.cssText = "position:fixed;top:0;left:0;bottom:0;right:0;z-index:3001;";
        _boxE = document.createElement("div");
        _boxE.style.cssText = "position:absolute;bottom:40px;left:40px;min-width:400px;padding:10px;" + 
                                "border:4px blue solid;background:#eeeeee;";
        _boxE.innerHTML = boxHTML;
        _screenE.appendChild(_boxE);
        document.body.appendChild(_screenE);
        _cancelBE = document.getElementById("gNgCancelB");
        _submitBE = document.getElementById("gNgSubmitB");
        document.body.addEventListener( "click", _cancelIt, false );
        _cancelBE.addEventListener( "click", _cancelIt, false );
        _submitBE.addEventListener( "click", _submitIt, false );
        _inputE = document.getElementById("gNgInput");
        _inputE.style.cssText = "width:100%;padding:5px;font-size:90%;font-family:sans-serif;";
        _inputE.focus();
        return true;
    }; //utGetAndGo
    /* ----------------------------------------------------------------------------------------- */
}() );

