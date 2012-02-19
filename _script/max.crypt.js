/*
    The routines contained herein are either Copyright 2010 J. R. McCall,
    or have a specific copyright notice within their function closure. All are
    free software, that you may use, modify, and distribute under the terms
    of the GNU General Public License (http://www.gnu.org/licenses/gpl.html)

    http://puffball.org/__GPL__/crypt.js
*/
var j45;
j45 || (j45 = {});
j45.CRYPT || (j45.CRYPT = {});
(function () {      //////////////////////////// AES //////////////////////////////////////
    'use strict';
    var CRYPT = j45.CRYPT;
    /*
     *  jsaes version 0.1  -  Copyright 2006 B. Poettering
     *
     * http://point-at-infinity.org/jsaes/
     *
     * This is a javascript implementation of the AES block cipher. Key lengths 
     * of 128, 192 and 256 bits are supported.
     *
     * The well-functioning of the encryption/decryption routines has been 
     * verified for different key lengths with the test vectors given in 
     * FIPS-197, Appendix C.
     *
     */
    /************************************** JRM notes ********************************************
        I've  done some name-changing and other sorts of trivial (but helpful to
        reading) style changes to these, Bertram Poettering's original routines that
        effect the AES cypher. I've also combined the key enlargement with initialization
        (though they are unrelated) and modified the encrypt and decrypt parameter lists 
        (i.e. the key is not supplied, as it was set during initialization (but can be reset!)). I
        also in-lined_addRoundKey and _subBytes. For the most part, too, input parameters
        are no longer modified, but kept intact. Finally, I got rid of  _Done, which just
        releases a small amount of space anyway: in general, the web page would go away
        before the need for (occasional) encryption would.

        This program is a straightforward implimentation of the FIPS document describing
        AES, without any attempt at optimization for speed. (There are no word-length
        operations, for example, only byte-length.) But, after all, this IS javascript, and
        is just for use in passing small, occasional secrets, not carrying on an extensive
        encrypted session. As such, the untuned code should be just fine. (JRM, 2010)
                            ***********************************************************
    */
    var _sBox = [ 99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171, 
      118, 202, 130, 201, 125, 250, 89, 71, 240, 173, 212, 162, 175, 156, 164, 114, 192, 183, 253, 
      147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216, 49, 21, 4, 199, 35, 195, 24, 150, 5, 154, 
      7, 18, 128, 226, 235, 39, 178, 117, 9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227, 
      47, 132, 83, 209, 0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207, 208, 239, 170, 
      251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168, 81, 163, 64, 143, 146, 157, 56, 245, 
      188, 182, 218, 33, 16, 255, 243, 210, 205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61, 
      100, 93, 25, 115, 96, 129, 79, 220, 34, 42, 144, 136, 70, 238, 184, 20, 222, 94, 11, 219, 224, 
      50, 58, 10, 73, 6, 36, 92, 194, 211, 172, 98, 145, 149, 228, 121, 231, 200, 55, 109, 141, 213, 
      78, 169, 108, 86, 244, 234, 101, 122, 174, 8, 186, 120, 37, 46, 28, 166, 180, 198, 232, 221, 
      116, 31, 75, 189, 139, 138, 112, 62, 181, 102, 72, 3, 246, 14, 97, 53, 87, 185, 134, 193, 29, 
      158, 225, 248, 152, 17, 105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223, 140, 161, 
      137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22 ];

    var _shiftRowT = [ 0, 5, 10, 15, 4, 9, 14, 3, 8, 13, 2, 7, 12, 1, 6, 11 ],
            _sBoxInv = new Array(256),
             _shiftRowInvT = new Array(16),
             _xTime = new Array(256),
            _theKey = [],
            initDone = false;
///////////////////////////////////////////////////////////////////////////////////////////
    CRYPT.aesSetKey = function ( inKey ) {
    //Set a key for subsequent encrypt or decrypt. If initialization
    //has not been done, it will be. The key can be changed using
    //this routine at any time. The key is a standard AES key of
    //16, 24, or 32 bytes.
        var ii, jj, newSize, temp,
                startLen = inKey.length,
                Rcon = 1;
        ////////
        _init();
        ////////
        _theKey = inKey.concat();
        switch ( startLen ) {
            case 16:
                newSize = 16 * (10 + 1);
                break;
            case 24:
                newSize = 16 * (12 + 1);
                break;
            case 32:
                newSize = 16 * (14 + 1);
                break;
            default:
                throw "aesSetKey: Wrong length key! Length: " + kl;
        } //switch
        for ( ii = startLen; ii < newSize; ii += 4 ) {
            temp = _theKey.slice( ii - 4, ii );
            if (ii % startLen === 0) {
                temp = [ _sBox[temp[1]] ^ Rcon, _sBox[temp[2]], 
	                                                _sBox[temp[3]], _sBox[temp[0]] ]; 
                if  ((Rcon <<= 1) >= 256) {
    	            Rcon ^= 0x11b;
                }
            }
            else if (  ( startLen > 24 ) && ( ii % startLen == 16 )  ) {
                    temp = [ _sBox[temp[0]], _sBox[temp[1]], 
	                                                    _sBox[temp[2]], _sBox[temp[3]] ];
            }
            for ( jj = 0; jj < 4; jj++ ) {
                _theKey[ ii + jj ] = _theKey[ ii + jj - startLen ] ^ temp[ jj ];
            } //for
        } //for
        return true;
    }; //aesSetKey
////////
    function _init() {
    /* 
       Initialize the tables needed at runtime. Its working is independent
        of the key or keysize.
    */
        var ii;
        if ( initDone ) {
            return true;
        }
        for ( ii = 0; ii < 256; ii++ ) {
            _sBoxInv[ _sBox[ii] ] = ii;
        } //for     
        for ( ii = 0; ii < 16; ii++ ) {
           _shiftRowInvT[ _shiftRowT[ii] ] = ii;
        } //for
        for ( ii = 0; ii < 128; ii++ ) {
            _xTime[ ii ] = ii << 1;
            _xTime[ 128 + ii ] = (ii << 1) ^ 0x1b;
        } //for
        initDone = true;
        return true;
    }; //aesInit
////////
    CRYPT.aesEncrypt = function ( iBlock ) {
    /* 
       encrypt the 16 byte array 'iBlock' with the previously 
       set key. (Does not change 'iBlock'.)
    */
        var ii, jj,
                oBlock = iBlock.concat(),
                keyLen = _theKey.length;
        for ( jj = 0; jj < 16; jj++ ) { // Add Round Key:
            oBlock[ jj ] ^= _theKey[ jj ];
        } //AddRoundKey
        for ( ii = 16; ii < (keyLen - 16); ii += 16 ) {
            for ( jj = 0; jj < 16; jj++ ) { //Subtract Bytes
                oBlock[ jj ] = _sBox[ oBlock[jj] ];
            } //SubBytes
            _shiftRows( oBlock, _shiftRowT );
            _mixColumns( oBlock );
            for ( jj = 0; jj < 16; jj++ ) { // Add Round Key:
                oBlock[ jj ] ^= _theKey[ ii + jj ];
            } //AddRoundKey
        } //for
        for ( jj = 0; jj < 16; jj++ ) { //Subtract Bytes
            oBlock[ jj ] = _sBox[ oBlock[jj] ];
        } //SubBytes
        _shiftRows( oBlock, _shiftRowT );
        for ( jj = 0; jj < 16; jj++ ) { // Add Round Key:
            oBlock[ jj ] ^= _theKey[ ii + jj ];
        } //AddRoundKey
        return oBlock;
    }; // aesEncrypt
    CRYPT.aesDecrypt = function ( iBlock ) {
    /* 
       decrypt the 16 byte array 'iBlock' with a previously 
       set key, into a new 16-byte array, which it returns.
    */
        var ii, jj,
            oBlock = iBlock.concat(),
            keyLen = _theKey.length;
        for ( jj = 0; jj < 16; jj++ ) { // Add Round Key:
            oBlock[ jj ] ^= _theKey[ (keyLen - 16) + jj ];
        } //AddRoundKey
        _shiftRows( oBlock, _shiftRowInvT );
        for ( jj = 0; jj < 16; jj++ ) { //Subtract Bytes
            oBlock[ jj ] = _sBoxInv[ oBlock[jj] ];
        } //SubBytes
        for (var ii = keyLen - 32; ii >= 16; ii -= 16) {
            for ( jj = 0; jj < 16; jj++ ) {  // Add Round Key:
                oBlock[ jj ] ^= _theKey[ ii + jj ];
            } //AddRoundKey
            _mixColumnsInv( oBlock );
            _shiftRows( oBlock, _shiftRowInvT );
            for ( jj = 0; jj < 16; jj++ ) { //Subtract Bytes
                oBlock[ jj ] = _sBoxInv[ oBlock[jj] ];
            } //SubBytes
        }
        for ( jj = 0; jj < 16; jj++ ) { // Add Round Key:
            oBlock[ jj ] ^= _theKey[ jj ];
        } //AddRoundKey
        return oBlock;
    }; //aesDecrypt

    /********************* Supporting Routines *********************/
    function _shiftRows( state, shifttab ) {
        var ii,
                workArr = state.concat();
        for ( ii = 0; ii < 16; ii++ ) {
            state[ ii ] = workArr[ shifttab[ii] ];
        } //for
    } //_shiftRows

    function _mixColumns( state ) {
        var ii, s0, s1, s2, s3, cAll;
        for ( ii = 0; ii < 16; ii += 4 ) {
            s0 = state[ ii + 0 ];
            s1 = state[ ii + 1 ];
            s2 = state[ ii + 2 ];
            s3 = state[ ii + 3 ];
            cAll = s0 ^ s1 ^ s2 ^ s3;
            state[ ii + 0 ] ^= ( cAll ^ _xTime[ s0 ^ s1 ] );
            state[ ii + 1 ] ^= ( cAll ^ _xTime[ s1 ^ s2 ] );
            state[ ii + 2 ] ^= ( cAll ^ _xTime[ s2 ^ s3 ] );
            state[ ii + 3 ] ^= ( cAll ^ _xTime[ s3 ^ s0 ] );
        }
    } //_mixColumns

    function _mixColumnsInv( state ) {
        var ii, s0, s1, s2, s3, cAll, xh, h1, h2;
        for ( ii = 0; ii < 16; ii += 4 ) {
            s0 = state[ ii + 0 ];
            s1 = state[ ii + 1 ];
            s2 = state[ ii + 2 ];
            s3 = state[ ii + 3 ];
            cAll = s0 ^ s1 ^ s2 ^ s3;
            xh = _xTime[ cAll ];
            h1 = _xTime[ _xTime[xh ^ s0 ^ s2] ] ^ cAll;
            h2 = _xTime[ _xTime[xh ^ s1 ^ s3] ] ^ cAll;
            state[ ii + 0 ] ^= h1 ^ _xTime[s0 ^ s1];
            state[ ii + 1 ] ^= h2 ^ _xTime[s1 ^ s2];
            state[ ii + 2 ] ^= h1 ^ _xTime[s2 ^ s3];
            state[ ii + 3 ] ^= h2 ^ _xTime[s3 ^ s0];
      }
    } //_mixColumnsInv
/* ************* End of AES routines ****************** */
}() );
(function () {  ///////////////////////////////////////////// Mode Encription /////////////////////////////////////////
    var CRYPT = this.j45.CRYPT;
/*
    These effect either the electronic-code-book (ECB) or the cypher-block-chaining (CBC) mode of
    encryption on an arbitrary octet array, by means of B. Poettering's AES encrypt/decrypt
    implementation, somewhat modified.

    These few routines will be used primarily to encrypt data to be POSTed to the back end, to a PHP
    process. (Occasionally, PHP will send something it encrypted to the front end, too, of course.) As a result,
    they have been written with PHP in mind -- in particular the 'mcrypt' routines that PHP uses for
    symmetric encrypt/decrypt. Thus we confine ourselves to AES-128, which, in the form of Rijndael-128,
    is the only AES cypher that mcrypt handles. Poettering's routines handle keylengths of 192 and 256 as well,
    but, hewing to the AES standard, keep a 128-byte data block. (So do these routines here, of course.) But
    Rijndael-192 and 256 have correspondingly longer data blocks. So AES-256, for example, could not be used
    for encryption here and understood as Rijndael-256 by mcrypt at the back end. Thus, for our POSTings,
    we confine ourselves to a 128-bit key, where AES-128 and Rijndael-128 match.

    For the front and back end to work together, they need (of course) that the same key and initialization vector
    are used for a given encrypt/decrypt cycle. For my purposes, the back end will, at each visit, create a new 16-byte
    nonce based on the time() function. This assures that each ivector is a unique 16-byte value generated at the back
    end, which is all we ask of it. The key will have come earlier from the front end, using pki techniques (for which
    see 'pki.js'). This requires the PHP process to have available the RSA private key corresponding to the
    front-end public key. (The best way to explain the various pieces is to refer you to 'index.php', 'talkToMe.php',
    and 'signon.php' in dandy.puffball.)

                    **********************************************************************************

        (James R. McCall, 2010)
*/
/////////
    var _theMode = 'ecb',
            _theIVector = [];
/////////
    CRYPT.cryptInit = function ( inKey, theMode, inIVector ) {
    /*
        Both 'inKey' and 'inIVector' are octet arrays. 'inKey' should be either
        16, 24, or 32 bytes in length, and 'inIVector' should be 16 bytes. 'inKey'
        should be secret, 'inIVector' simply unique (i.e. different at each invocation).
        This initializes for symmetric encryption using AES 128, 192, or 256, depending
        on whether the key is 16, 24, or 32 bytes.

        'theMode' is 'ecb' or 'cbc': defaults to 'ecb', which needs no vector.
    */
        CRYPT.aesSetKey( inKey );
        if ( !theMode || (theMode === 'ecb') ) {                //use default mode of  'ecb': need no vector
            return true;
        }
        if ( theMode === 'cbc' ) {
            _theMode = theMode;
        } else {
            throw "aesSetKey: Bad Mode";
        }
        if ( inIVector.length != 16 ) {
            throw "aesSetKey: bad initialization vector";
        }
        _theIVector = inIVector.concat();
        return true;
    }; //cryptInit
    Array.prototype.j45cryptEn = function() {
    /*
        Encrypt the octet-array (this) using aes128, aes192, or aes256 as the initial key was
        16, 24, or 32 bytes. The padding scheme: the data has a 0x80 byte added to the end,
        then padding is continued with nulls to make the total length of data + padding divisible
        by 16. In the best case the (data length + 1) is divisible by 16, so the only padding byte is
        0x80. Worst case: data length is divisible by 16, so the last (16-byte) block is entirely padding:
        0x80 00 00 ... 00. (Suggested by Schneier and Ferguson.)

        This modified array is encrypted by means of the cypher-block-chaining (CBC) mode,
        using the initialization vector supplied via 'cryptInit', or the electronic-codebook (ECB)
        mode, which needs no ivector.

        Returns an octet-array which is the encryption of this data+padding. If  'j45cryptDe' is used
        to decrypt it, then it will automatically return the proper data after stripping the padding.
    */
        var ii, oo, inBlock, inLen,
            dataArr = this.concat( [0x80] ),
            outArr = [],
            encBlock = _theIVector;
        while ( dataArr.length % 16 ) {
            dataArr.push(0);
        } //while
        inLen = dataArr.length;
        for ( ii = 0; ii < inLen; ii += 16 ) {
            inBlock = dataArr.slice( ii, (ii+16) );
            switch( _theMode ) {
                case 'ecb':
                    break;
                case 'cbc':
                    for ( oo = 0; oo < 16; oo++ ) {
                        inBlock[oo] ^= encBlock[oo];
                    }
                    break;
                default:
                    throw "j45cryptEn: improper mode";
            } //switch
            encBlock = CRYPT.aesEncrypt( inBlock );
            outArr = outArr.concat( encBlock );
        } //for
        return outArr;
    }; //j45cryptEn    
    Array.prototype.j45cryptDe = function() {
    /*
        Decrypt 'this' octet array back to its original octet array. It must have been
        encrypted with an AES cypher using the key, mode, and (possibly) ivector
        supplied to 'j45cryptInit', and have "Schnier-Ferguson" padding (for which
        see the intro to 'j45cryptEn'). After decryption the padding is stripped off, and
        the original data array returned.
    */
        var ii, oo, plainBlock, inBlock, outLen,
                inLen = this.length,
                encBlock = _theIVector,
                plainArr = [];
        for ( ii = 0; ii < inLen; ii += 16 ) {
            inBlock = this.slice( ii, (ii+16) );
            plainBlock = CRYPT.aesDecrypt( inBlock );
            switch( _theMode ) {
                case 'ecb':
                    break;
                case 'cbc':
                    for ( oo = 0; oo < 16; oo++ ) {
                        plainBlock[oo] ^= encBlock[oo];
                    }
                    encBlock = inBlock;
                    break;
                default:
                    throw "j45cryptDe: improper mode";
            } //switch
            plainArr = plainArr.concat(plainBlock);
        } //for
        //Now to strip the padding: search backwards for the first 0x80 ...
        for ( ii = (plainArr.length - 1); ii > 0; ii-- ) {
            if ( plainArr[ii] === 0x80 ) {
                return plainArr.slice( 0, ii );                
            }
        } //for
        return false;
    }; //j45cryptDe
    CRYPT.cryptCombine = function ( vObj ) {
    //Property names should be alphanumeric, values either octet arrays or unicode strings.
    //Returns an ASCII string of name-value pairs, with names and base64-ed values separated by '&',
    //converted to an octet-array (which the encryption routine expects). (The values are base64-ed 
    //so as to guarantee ASCII. The names are simply constrained to be so.)
    //
    //See the PHP processing for how the original values are teased out again after the encrypt/
    //decrypt cycle.
        var aName, aValue, aValue64,
                outStr = '';
        for ( aName in vObj ) {
            aValue = vObj[aName];
            if ( typeof aValue === "string" ) {
                aValue = aValue.j45crackToUTF8();
            }
            aValue64 = aValue.j45base64("+/=");
            outStr += ( aName + "&" + aValue64 + "&" );
        } //for-in
        return outStr.j45O2O();
    }; //cryptCombine
    CRYPT.cryptXPOST = function( POSTmsg, theKey ) {
        //Encrypted POST to one's own back end.
        //Input: an octet array to encrypt and POST, and a key to use
        //Output: a unique ivector is generated, the message encrypted using the ivector, which
        //  is then attached to the encrypted message, and the whole string base64-ed and POST-ed.
        var cryptFE, dCommonE, theIV;
        theIV = Date.now().toString(16).j45crackToUTF8();
        theIV = theIV.concat( theIV ).slice(-16);
        cryptFE = document.createElement( "form" );
        cryptFE.style.visibility = "hidden";
        cryptFE.action = window.location.pathname;
        cryptFE.method = "POST";
        cryptFE.target = "_self";
        dCommonE = document.createElement( "input" );
        dCommonE.name = "theCommon";
        CRYPT.cryptInit( theKey, 'cbc', theIV );
        dCommonE.value = ( theIV.concat( POSTmsg.j45cryptEn() ) ).j45base64("-_,");
        cryptFE.appendChild( dCommonE );
        document.body.appendChild( cryptFE );
        cryptFE.submit();
    }; //cryptXPOST
    CRYPT.xhrXPOST = function( theURL, POSTmsg, theKey, theCallback ) {
        //an encrypted interim POST using XMLHttpRequest:
        //Input: the URL to POST to; an octet array to encrypt and POST;
        // a 16-byte AES encryption key to use; theCallback( request ),
        // called when the response is received.
        //Output: a unique ivector is generated, the message encrypted using the ivector, which
        //  is then attached to the encrypted message, and the whole string base64-ed and POST-ed
        //  via XMLHttpRequest. (Thanks, Rhino!)
        var cryptFE, dCommonE, theIV, aRequest;
        anRq = new XMLHttpRequest();
        anRq.open( "POST", theURL );
        anRq.onreadystatechange = function() {
                                        if ( (anRq.readyState === 4) && theCallback ) {
                                            theCallback( anRq );
                                        };
                                    };
        anRq.setRequestHeader( "Content-Type", "application/x-www-form-urlencoded" );
        theIV = Date.now().toString(16).j45crackToUTF8();
        theIV = theIV.concat( theIV ).slice(-16);
        CRYPT.cryptInit( theKey, 'cbc', theIV );
        anRq.send( "theCommon=" + encodeURIComponent( (theIV.concat( POSTmsg.j45cryptEn() )).j45base64("-_,") ) );
    }; //xhrXPOST
}() ); //////////////// crypt //////////////////////////

