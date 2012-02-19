/*
    The routines contained herein are either Copyright 2010 J. R. McCall,
    or have a specific copyright notice within their function closure. All are
    free software, that you may use, modify, and distribute under the terms
    of the GNU General Public License (http://www.gnu.org/licenses/gpl.html)

    http://puffball.org/__GPL__/hash.js
*/
var j45;
j45 || (j45 = {});
j45.CRYPT || (j45.CRYPT = {});
(function () {
    'use strict';
    var CRYPT = j45.CRYPT,
        b64stub = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        _hexArr = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f" ];
    Array.prototype.j45base64 = function( iiPad ) {
    //assumes the array is octets (<256) only: returns a base64-encoded string
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4,
                ii = 0,
		        theOutStr = '',
                inLen = this.length,
                div3Len = inLen - (inLen % 3),                  //take the triplets first
                b64table = b64stub.concat(iiPad);
        while ( ii < div3Len ) {
            chr1 = this[ii];
            ii++;
            chr2 = this[ii];
            ii++;
            chr3 = this[ii];
            ii++;
			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 0x03) << 4) | ((chr2 & 0xff) >> 4);
			enc3 = ( ((chr2 & 0x0f) << 2) | ((chr3 & 0xff) >> 6) );
			enc4 = ( chr3 & 0x3f );          
			theOutStr += b64table.charAt(enc1) + b64table.charAt(enc2) + b64table.charAt(enc3) + b64table.charAt(enc4);
        } //while
        //Now we have 0, 1, or 2 inputs left ...
        if ( inLen === div3Len ) {                  //the original string length was divisible by three
		    return theOutStr;
        }
        chr1 = this[ii];                    //there is one left, or there are two: let's take one now...
        enc1 = chr1 >>2;
        if ( (inLen % 3) === 1 ) {           //there was just one left ...
            enc2 = ( (chr1 & 0x03) << 4 );
            enc3 = 64;
        } else {                            //there were two left ...
            chr2 = this[ii+1];
			enc2 = ((chr1 & 0x03) << 4) | ((chr2 & 0xff) >> 4);
            enc3 = ( (chr2 & 0x0f) << 2 );
        }
        enc4 = 64;
        theOutStr += b64table.charAt(enc1) + b64table.charAt(enc2) + b64table.charAt(enc3) + b64table.charAt(enc4);
        return theOutStr;
    }; //j45base64
    String.prototype.j45debase64 = function( iiPad ) {
    // From **this** Base64 string and using the 3-character **iiPad** (eg "+/=" (as in rfc2045)
    // or ( "-_," (for URLs)) that was used in the encoding, decodes to an array of the original octets.
        var hex1, hex2, hex3, hex4, bits, oct1, oct2, oct3,
                ii = 0,
                inLen = this.length,
                outArr = [],
                trStr = b64stub.concat(iiPad);     
        if ( this.length === 0 ) {
            return [];
        }
        if ( ((inLen % 4) != 0) || (iiPad.length != 3) ) {
            throw "j45debase64: Bad input";
        }
        // unpack four hexets into three octets using index points in trStr
        do {
            //this works since all base64 strings are multiples of 4 in length
            hex1 = trStr.indexOf(this.charAt(ii++));
            hex2 = trStr.indexOf(this.charAt(ii++));
            hex3 = trStr.indexOf(this.charAt(ii++));
            hex4 = trStr.indexOf(this.charAt(ii++));
     
            bits = hex1<<18 | hex2<<12 | hex3<<6 | hex4;
            oct1 = bits>>16 & 0xff;
            oct2 = bits>>8 & 0xff;
            oct3 = bits & 0xff;
     
            outArr.push( oct1 );
            if ( hex3 == 64 ) {         //if we have hit padding, we're done
                break;
            }
            outArr.push( oct2 );
            if (hex4 == 64) {
                break;
            }
            outArr.push( oct3 );
        } while (ii < inLen );
        return outArr;
    }; //j45debase64
    String.prototype.j45toEntities = function (inHex) {
        //the analog of 'encodeURIComponent':
        //emits a string that is HTML unicode entities: if **inHex** exists and is true,
        //then they are emitted in hex format, otherwise decimal. Those characters in the ASCII
        //range (<128) are emitted as themselves. Internally, the routine generalizes
        //string.charCodeAt to properly return the unicode value for characters
        //built from two adjacent 2-byte "surrogate" values, as well as the ordinary characters
        //that occupy 2 (or 1) bytes, and whose utc16 value IS their unicode value. (Thanks, mozilla!)
        var ii = 0,
                theUCode, theLow,
                strLen = this.length,
                thePrefix = inHex ? "&#x" : "&#",
                theRadix = inHex ? 16 : 10,
                outStr = '';

        while  ( ii < strLen ) {
            theUCode = this.charCodeAt( ii );
            if (0xD800 <= theUCode && theUCode <= 0xDBFF) {         //high surrogate?
                theLow = this.charCodeAt( ii + 1 );
                outStr += thePrefix + ( ( ((theUCode & 0x3ff) << 10) | (theLow & 0x3ff) ) + 0x10000 ).toString(theRadix) + ";";
                ii += 2;
                continue;
            }
            if ( theUCode > 127 ) {
                outStr += thePrefix + theUCode.toString(theRadix) + ";";
                ii +=1;
                continue;
            }
            outStr += this.charAt( ii );
            ii += 1;
        } //while
        return outStr;
    };  //j45toEntities
    String.prototype.j45crackToUTF8 = function () {
    //The string is UTF-16, and may contain any Unicode characters: return
    //an array of octets that represents the string in UTF-8.
        var ii = 0,
                theUCode, theLow,
                outArr = [],
                strLen = this.length;
        while  ( ii < strLen ) {
            theUCode = this.charCodeAt(ii);
            if (0xD800 <= theUCode && theUCode <= 0xDBFF) {         //really a high surrogate?
                if ( ii > (strLen - 1) ) {
                    throw "j45crackToUTF8: Invalid UTF16 format";
                }
                theLow = this.charCodeAt(ii +1);
                theUCode = (   ( ((theUCode & 0x3ff) << 10) | (theLow & 0x3ff) ) + 0x10000   );
                ii += 2;
            } else {
                ii += 1;
            }
            //at this point we have the unicode value, and have bumped the counter
            if ( theUCode < 127 ) {
                outArr.push(theUCode);
                continue;
            }
            if ( theUCode < 0x800 ) {        //make a 2-byte code
                outArr.push(  ( ((theUCode & 0x7c0) >>> 6) | 0xc0 )  );
                outArr.push(  ( (theUCode & 0x3f) | 0x80 )  );
                continue;
            }
            if ( theUCode < 0x10000 ) {             //make a 3-byte code
                outArr.push(  ( ((theUCode & 0xf000) >>> 12) | 0xe0 )  );
                outArr.push(  ( ((theUCode & 0xfc0) >>> 6) | 0x80 )  );
                outArr.push(  ( (theUCode & 0x3f) | 0x80 )  );
                continue;
            }
            //Into the 4-byte code range ...
            outArr.push(  ( ((theUCode & 0x1c0000) >>> 18) | 0xf0 )  );
            outArr.push(  ( ((theUCode & 0x3f000) >>> 12) | 0x80 )  );
            outArr.push(  ( ((theUCode & 0xfc0) >>> 6) | 0x80 )  );
            outArr.push(  ( (theUCode & 0x3f) | 0x80 )  );
        } //while
        return outArr;
    };  //j45crackToUTF8
    Array.prototype.j45patchFromUTF8 = function() {
    //an array of UTF-8 octets to a UTF-16 javascript string: there
    //is no error-checking
        var ii = 0,
                theFirst, theSecond, theThird, theFourth,
                outStr = '',
                inLen = this.length;

        function _fromCharCode (codePt) {
        //(thanks, mozilla! (and rfc2781))
            var subCode;  
             if (codePt > 0xFFFF) {  
                 subCode = codePt - 0x10000;  
                 return String.fromCharCode(  ( 0xD800 | ((subCode & 0xffc00) >>> 10)), ( 0xDC00 | (subCode & 0x3ff) )  );  
             }  
             else {  
                 return String.fromCharCode(codePt);  
             }
        } //_fromCharCode  

        while ( ii < inLen ) {
            theFirst = this[ii];
            if ( !(theFirst & 0x80) ) {           // <128?
                outStr += _fromCharCode(theFirst);
                ii += 1;
                continue;
            }
            if ( !(theFirst & 0x20) ) {           //if bit5 0, a 2-octet encoding
                theSecond = this[ii + 1] & 0x3f;
                outStr += _fromCharCode(  ( ((theFirst & 0x1f) << 6) | theSecond )  );
                ii += 2;
                continue;
            }
            if ( !(theFirst & 0x10) ) {           //if bit4 0, a 3-octet encoding
                theSecond = this[ii + 1] & 0x3f;
                theThird = this[ii + 2] & 0x3f;
                outStr += _fromCharCode(  ( ((theFirst & 0x0f) << 12) | (theSecond << 6) | theThird )  );
                ii += 3;
                continue;
            }
            //assuming this IS utf-8, then it must be a 4-octet encoding...
            theSecond = this[ii + 1] & 0x3f;
            theThird = this[ii + 2] & 0x3f;
            theFourth = this[ii + 3] & 0x3f;
            outStr += _fromCharCode(  ( ((theFirst & 0x07) << 18)  | (theSecond << 12) | (theThird << 6) | theFourth )  );
            ii += 4;
        } //while
        return outStr;
    } //j45patchFromUTF8
    Array.prototype.j45indexOf = function( testArr ) {
    //find location of 'testArr' within 'this'; return -1 on failure
        var ii = 0,
                jj,
                thisLen = this.length,
                tLen = testArr.length,
                firstc = testArr[0],
                lastChance = thisLen - tLen - 1;
        do {
            while ( ii <= lastChance ) {
                if ( firstc == this[ii] ) {
                    break;
                }
                i++;
            } //while
            if ( ii > lastChance ) {
                return -1;
            }
            for ( jj = 1; jj < tLen; jj++ ) {
                if ( this[ii + jj] != testArr[jj] ) {
                    break;
                }
            } //for
            if ( jj == tLen ) {
                return ii;
            }
            ii++           
        } while (true);
    }; //j45indexOf
    Array.prototype.compare = function ( withArr, cfunc ) {
    //compare 'this',  'withArr': call cfunc( this[i], withArr[i] ) for each element
    //inspected; cfunc returns -1 (this[i] < withArr[i]), 0 (this[i] == withArr[i]),
    //or 1 (this[i] > withArr[i]). Returns -1, 0, 1 as 'this' <, ==, > withArr, resp.
    //Arrays are compared low-index to high, returning as soon as there is non-
    //equality, or one array runs out of elements before the other. if 'cfunc' is 
    //missing, each element is compared, lexicographically, as a string.
        function _strC( aThis, aWith ) {
            return aThis.toString().localeCompare( aWith.toString() );
        } //_strC
            var ii, aComp,
                    dCompF = ( cfunc ) ? cfunc : _strC,
                    withLen = withArr.length,
                    inLen = this.length;
            for ( ii = 0; ii < inLen; ii++ ) {
                if ( ii >= withLen ) {
                    return 1;
                }
                if ( (aComp = dCompF( this[ii], withArr[ii] )) == 0 ) {
                    continue;
                }
                return aComp; 
            } //for
            return ( ii < withLen ) ? -1 : 0;
    }; //compare
    Array.prototype.j45O2H = function( yesSpace ) {
    //'this' is an array of octets (i.e. all values < 256);
    //returns the equivalent hex character string.
    //no error checking
        var ii, aNum,
                inLen = this.length,
                sepSpa = (yesSpace) ? " " : "",
                outStr = "";
        for ( ii = 0; ii < inLen; ii++ ) {
            aNum = this[ii];
            outStr += ( sepSpa + ( _hexArr[(aNum & 0xf0) >> 4] + _hexArr[(aNum & 0x0f)] ) );
        }
        return outStr;    
    } //j45O2H
    String.prototype.j45H2O = function() {
    //from a hex string to an octal array: an odd-length string first gets a prefixed "0".
        var ii,
                outArr = [],
                workStr = ( (this.length & 1) ? "0" + this : this ),
                inLen = workStr.length;
        for ( ii = 0; ii < inLen; ii += 2 ) {
            outArr.push( parseInt( workStr.substr(ii, 2), 16 ) );
        } //for
        return outArr;
    }; //j45H2O 
    String.prototype.j45O2O = function() {
    //in: a string of octets (encoding irrelevant); out: an octal array.
        var ii,
            outArr = [],
            inLen = this.length;
        for ( ii = 0; ii < inLen; ii += 1 ) {
            outArr.push( this.charCodeAt(ii) );
        } //for
        return outArr;
    }; //j45O2O
    String.prototype.j45toHex = function( sepChar ) {
    /*
        break the string into its characters' values, (possibly separated and) displayed in hex...
        As javascript has UTF-16 strings, these will be, potentially, three-byte numbers.
        'sepChar', if it is there, is a 1-character string (ideally not a hex digit!) that will separate the
        hex representations of each input character's value.
        NOTE that this output cannot be brought back to the original string unless some separator is in place.
    */
        var ii, aNum, theSep,
                theOut = '',
                inLen = this.length;
        if ( (typeof sepChar != "string") || !sepChar.length ) {
            theSep = '';
        } else {
            theSep = sepChar.substr(0);
        }
        for ( ii = 0; ii < inLen; ii++ ) {
            theOut += (ii) ? theSep : '';
            aNum = this.charCodeAt(ii);
            if ( aNum > 0xffff ) {
                theOut += ( _hexArr[(aNum & 0xf00000) >> 20] + _hexArr[(aNum & 0x0f0000) >> 16] );
            }
            if ( aNum > 0xff ) {
                theOut += ( _hexArr[(aNum & 0x00f000) >> 12] + _hexArr[(aNum & 0x000f00) >> 8] );
            }
            theOut += ( _hexArr[(aNum & 0x0000f0) >> 4] + _hexArr[(aNum & 0x00000f)] );
        } //for
        return theOut;
    }; //j45toHex
    String.prototype.j45fromHex = function( sepChar ) {
    /*
        if no parameter, an octet-only string will be built. A single character separator can
        be specified. If so, each so-defined hex substring will be translated to a character code
        for the target string. Clearly, if any of these numbers is too large to be accommodated in
        a javascript string, failure will ensue. (Character encodings are not considered.)
        An odd-length unseparated string will have '0' tacked on front to complete the first pair.
    */
        var ii, workStr, inLen, arrLen,
                workArr = [], 
                outStr = '';
        if ( (typeof sepChar == "string") && (sepChar.length === 1) ) {
            workArr = this.split( sepChar );
        } else {        //must be octets
            workStr = (this.length & 1) ? ("0" + this) : this;
            inLen = workStr.length;
            for ( ii = 0; ii < inLen; ii +=2 ) {
                workArr.push( workStr.substr(ii, 2) );
            }
        }
        arrLen = workArr.length;
        for ( ii = 0; ii < arrLen; ii++ ) {
            try {
                outStr += String.fromCharCode( parseInt(workArr[ii], 16) );
            } catch (e) {
                throw e;
            }
        } //for        
        return outStr;
    }; //j45fromHex
})(); //utility routines
(function () {
/* **********************************************************************************************
                                                  SHA-NA-NA

    Right now, the only hash in here is the SHA-256, which produces a 32-byte (256 bit)
    output. It might be handy to have, say, MD-5, in order to produce a 16-byte output.
    While MD-5 has its vulnerabilities, they are probably not important for integrity-
    checking of POSTs that also use a nonce. But, at the moment, I ain't got one.

    In these, as in most of my utilities, octet arrays (that is, arrays each value of which
    fits into a single byte) are the chosen input and output vehicles, rather than strings.
    Strings are fine to move around unicode, hex values, and base64, but for general
    bitstring stuff, they are clumsy and ambiguous.
********************************************************************************************** */
    var CRYPT = this.j45.CRYPT;
/////////////////////////
    var _h = [ 0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
                     0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19 ],
              _k = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
                  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
                  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
                  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
                  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
                  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
                  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
                  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
                  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
                  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
                  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
                  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
                  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
                  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
                  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
                  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    Array.prototype.j45sha256 = function() {
    /*
        Implements the SHA-256 hash of the SHA-2 family of hashes.

        Input: an octal array of arbitrary length;
        Output: a 256-bit digest in the form of an octal array of length 32.

        The 'this' array is, conceptually, a bitstring that happens to be in 8-bit chunks.
        However, it is not a number: any leading 0's are part of the string, and the end
        of the string is bit 7 of the last byte.

        To put a text string into the proper format: 

            theDigest = textStr.j45crackToUTF8().j45sha256()

        To put an octal string (1 byte's worth of data/character position)  into the proper format:

            theDigest = octStr.j45O2O().j45sha256()

        and so on.
    */
        var ii, ss, zeroPush, byteResidue, workLen, wii2, wii15, tmp0, tmp1,
            outArr = [],
            _w = [],
            currentLoc = 0,
            inLen = this.length,
            inBits = inLen * 8,
            workArr = this.concat(0x80);                    //add a '1' bit to message end (drags along an entire byte...)
            var s0, s1, t1, t2, maj, ch,
                    accA, accB, accC, accD, accE, accF, accG, accH;
    /*
        Given that 512 has 8 as a factor, and workArr has a length of (k*8 + 1) bits, we know we're safe to the end
        of the new byte, so let's pad in the prescribed way, then get our 512-bit blocks. Let's work in bytes for a bit.
        Need a residue of 56 (448 bits):
    */
            byteResidue = ( workArr.length % 64 );                    //how many bytes are left in the last chunk?
            if ( byteResidue <= 56 )  {
                zeroPush = 56 - byteResidue;
            } else {                                                             //damn! That means we need a whole new chunk...
                zeroPush = 120 - byteResidue;                   //(64 - byteResidue) + 56
            }
            for ( ii = zeroPush; ii > 0; ii-- ) {
                workArr.push(0);
            }
    /*
            Our bitstring's length is now 8 bytes (64 bits) shy of being 64-byte (512-bit) divisible. Let's build an 8-byte
            (64-bit) string that gives us the length in big-endian format. Let us assume the length, in bytes, of our input
            array can fit into 31 bits (a reasonable assumption!), then, certainly, that (original!) number-of-bytes can be
            converted to number-of-bits (<< 3) as we go along ... (Remember, we are still in octet-array format.)
    */
            workArr.push(   0, 0, 0, ((inLen & 0xe0000000) >>> 29), ((inLen & 0x1fe00000) >>> 21), ((inLen & 0x001fe000) >>> 13),
                                                 ((inLen & 0x00001fe0) >>> 5), ((inLen & 0x0000001f) << 3)   );
    /*
            Our work array is now fully-populated; we'll take 64-byte chunks of it to make our 16-word
            chunk array as we go along ...
    */
            workLen = workArr.length;
            ///////////////////////////////////////////////////////////////////////////
            while ( currentLoc < workLen ) {     
                for ( ii = 0; ii < 16; ii +=1 ) {
                    ss = currentLoc + 4 * ii;
                    _w[ii] = (  (workArr[ss] << 24) | (workArr[ss+1] << 16) | (workArr[ss+2] << 8) | workArr[ss+3]  );
                } //for
                //Let's expand the w array (as required) from 16 to 64 members:
                for ( ii = 16; ii < 64; ii++ ) {
                    wii15 = _w[ii - 15];
                    tmp0 = (   ( (wii15 >>> 7) | (wii15 << 25) ) ^ ( (wii15 >>> 18) | (wii15 << 14) ) ^ (wii15 >>> 3)   );
                    wii2 = _w[ii - 2];
                    tmp1 = (   ( (wii2 >>> 17) | (wii2 << 15) ) ^ ( (wii2 >>> 19) | (wii2 << 13) ) ^ (wii2 >>> 10)   );
                    _w[ii] = (  ( _w[ii - 16] + tmp0 + _w[ii - 7] + tmp1 ) & 0xffffffff  );
                } //for
                accA = _h[0];
                accB = _h[1];
                accC = _h[2];
                accD = _h[3];
                accE = _h[4];
                accF = _h[5];
                accG = _h[6];
                accH = _h[7];
                for ( ii = 0; ii < 64; ii++ ) {
                    s0 = (  ((accA >>> 2) | (accA << 30)) ^ ((accA >>> 13) | (accA << 19)) ^ ((accA >>> 22) | (accA << 10))  );
                    maj = (  (accA & accB) ^ (accA & accC) ^ (accB & accC)  );
                    t2 = s0 + maj;
                    s1 = (  ((accE >>> 6) | (accE << 26)) ^ ((accE >>> 11) | (accE << 21)) ^ ((accE >>> 25) | (accE << 7))  );
                    ch = (  (accE & accF) ^ ((~accE) & accG)  );
                    t1 = accH + s1 + ch + _k[ii] + _w[ii];
                    accH = accG;
                    accG = accF;
                    accF = accE;
                    accE = (accD + t1);
                    accD = accC;
                    accC = accB;
                    accB = accA;
                    accA = (t1 + t2);
                } //for
                //Update the results so far ...
                _h[0] = ( (_h[0] + accA) & 0xffffffff );
                _h[1] = ( (_h[1] + accB) & 0xffffffff );
                _h[2] = ( (_h[2] + accC) & 0xffffffff );
                _h[3] = ( (_h[3] + accD) & 0xffffffff );
                _h[4] = ( (_h[4] + accE) & 0xffffffff );
                _h[5] = ( (_h[5] + accF) & 0xffffffff );
                _h[6] = ( (_h[6] + accG) & 0xffffffff );
                _h[7] = ( (_h[7] + accH) & 0xffffffff );
                currentLoc += 64;                               //currentLoc now points to the start of the next 512-bit chunk
            } //the big while loop
            ///////////////////////////////////////////////////////////////////////////
        /////Now, emit the accumulators, 0 to 7, after breaking them into octets ////////
        for ( ii = 0; ii < 8; ii++ ) {
            t1 = _h[ii];
            outArr.push( ((t1 & 0xff000000) >>> 24), ((t1 & 0x00ff0000) >>> 16),
                                        ((t1 & 0x0000ff00) >>> 8), (t1 & 0x000000ff)  );
        } //for
        return outArr;
    }; //j45sha256
}() ); /////////////////////// SHA-NA-NA //////////////////////////////////////////////

