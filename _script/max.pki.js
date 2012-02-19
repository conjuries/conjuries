/*
    The routines contained herein are either Copyright 2010 J. R. McCall,
    or have a specific copyright notice within their function closure. All are
    free software, that you may use, modify, and distribute under the terms
    of the GNU General Public License (http://www.gnu.org/licenses/gpl.html)

    http://puffball.org/__GPL__/pki.js
*/
var j45;
j45 || (j45 = {});
j45.PKI || (j45.PKI = {});
(function() {
    'use strict';
    var PKI = j45.PKI;
/***************************************************************************************
                                              ASN.1 Parse
***************************************************************************************/
    PKI.asn1Parse = function ( theASN ) {
    /*
        Returns an array that mirrors the structure of the input octet array, which is
        assumed to be ASN.1 format (tag-length-value...), DER encoding. For example,
        if the structure consists of n 1st-level subsidiary values, they could be accessed by
        returned-array[0], ...,returned-array[n-1]. Any of these values could itself be an array,
        if the value represents a subsidiary asn.1 structure rather than a 'simple' value.
        Simple values are not converted or otherwise handled by this routine: they are, within
        their array, objects with 'tag' and 'value' properties. 'tag' holds the ASN.1 type tag,
        and 'value' the array slice (of the asn.1-indicated length) that followed it.

        All 'simple' values are octet-arrays.
    */
        var asnPtr = 0;
        function parse( dLen ) {
        /*
            Parses an asn.1-format slice of 'theASN', given its length. (The slice's start within 'theASN' 
            is given by 'asnPtr'.) Returns an array whose elements are either simple value objects or arrays that
            result from a recursive call to 'parse' for constructed subarrays. Initially, 'asnPtr' points, within 'theASN',
            to where parsing is to begin. Upon return, it points 'dLen' farther along.

            As this routine was written to parse PKI keys, it works under the assumption that the input was encoded
            using DER ('Distinguished Encoding Rules'), rather than the more-general Basic Encoding Rules. Here, the
            only restriction this introduces is that there can be no strings whose termination is signalled by a null byte:
            all must have prior length byte(s).
        */
            var startPtr = asnPtr;
            var ttag, llen,
                    arrEnd = asnPtr + dLen - 1,     //the last legal index
                    outArr = [];
	        while( asnPtr < arrEnd ) {          //need (at least) current and next byte, since no asn.1 structure ends on a tag
		        // get the tag
		        var ttag = theASN[asnPtr++];
                if ( ttag == 0x05 ) {                   //null value, so following (length) byte should be 0: chuck them both
                    asnPtr++;
                    continue;
                }
                llen = theASN[asnPtr];
                asnPtr++;
	            if ( llen & 0x80 ) {         //is this a data length prefix, not a length?
                    switch ( llen & 0x7f ) {
                        // case 0 (i.e. indefinite run to an end-of-contents (0) byte) not allowed in DER encoding
                        case 1:
                            llen = theASN[asnPtr];
                            asnPtr++;
                            break;
                        case 2:
                            llen = ( (theASN[asnPtr] << 8) | theASN[asnPtr+1] );
                            asnPtr += 2;
                            break;
                        default:
                            throw "asn1Parse: wrong format for length bytes";   //we shall accomodate only 1 or 2...
                    } //switch
                }
                if ( llen >  (arrEnd - asnPtr + 1) ) {
                    throw "asn1Parse: data too long";
                }
		        if (ttag & 0x20) {                     // is the value "constructed" or simple?
			        outArr.push( parse(llen) );       // constructed, parse it, and push its array
                    continue;
                }
                //It's a simple value: push an object:
                outArr.push( { tag:ttag, value:theASN.slice( asnPtr, (asnPtr + llen) ) } );
                asnPtr += llen;
	        } //while
            return outArr;            
        } //parse
    //////////////////////////////////start processing////////////////////////////////////////////////
    /*
        What comes back is an array of arrays. There will be primitive value
        objects in here from place to place. "Primitive" is, of course, a matter of
        interpretation. Within the interested application, these could themselves
        be structures. To this parsing routine, such may simply be found as--e.g.--
        'bitstrings' (manifested as octet arrays, of course)...
    */
        return parse( theASN.length );
    }; //asn1Parse
/* **********************************************************************************************
                                               BIG NAT

    The following routines impliment 'BigNat'. They create and manipulate objects that
    represent natural numbers of arbitrary size. The manipulations available are all at the
    service of  "Montgomery", a numerical technique (whose routines are further on in
    this file), and "RSA", the RSA public-key encryption routine (also included here). Thus
    certain operations, such as multiplication and division, are missing. Moreover, negative
    numbers are not needed for the above work, so the complication of full integer
    arithmetic is avoided.

    The numbers are internally represented by arrays of chunks. These chunks are as large
    as possible, considering that we want to do precise integer arithmetic and bit work on
    numbers as large as javascript can handle with 'native' routines for such. This puts us at
    31 bits/chunk, since we don't have the 52-bit overflow restriction (no multiplication!).
    But I'm a bit leery of that last bit, so go 30. If, for some reason, you wish to use smaller
    chunks, you can go as low as 8 in 'natChunkSize' and everything should work.

********************************************************************************************** */
    (function () {          /////////////// Big Nat /////////////////////////
        var natChunkSize = 30,
            natChunkHighBit = 1 << (natChunkSize - 1),
            natOverFlowTest = (1 << natChunkSize),
            natDigitMask = natOverFlowTest - 1;

        function BigNat( inArr ) {
        /*
            This is the constructor: it expects an array of octets, which is effectively a natural number,base 256,
            in big-endian order. It emits a 'bigNat' -- also a big number, but internally represented as an array
            of 'chunks' in LITTLE-endian order, where each chunk is a number between 0 and 2**ChunkSize.
             bigNat = { dig: (little-endian array of chunks), . . . }

             An empty or absent input produces a a zero-value bigNat, which has an empty dig array.
             A non-octet-array is treated as if its values are confined to the low-order byte ...
        */
            this.dig = [];
            var ii, sigStart, inByte,
                    inLen = ( (typeof inArr === "object") ? inArr.length : 0 ),
                    outChunk = 0,
                    outBits = 0,
                    outMask = 0xff,
                    bitsToOr = 8;
            //first, let's trim the high-order 0's...
            for ( sigStart = 0; sigStart < inLen; sigStart++ ) {
                if ( inArr[sigStart] !== 0 ) {
                    break;
                }
            } //for
            if ( sigStart >= inLen ) {      //empty dig array
                return this;
            }
            for ( ii = inLen - 1; ii >= sigStart; ii-- ) {
                inByte = ( inArr[ii] & 0xff );              //enforce the octet-ness
                outChunk |= ((inByte & outMask) << outBits);
                outBits += bitsToOr;
                if ( outBits >= natChunkSize ) {
                //start a new chunk
                    this.dig.push( outChunk );
                    outChunk = 0;
                    outChunk |= (inByte >>> bitsToOr);
                    outBits = 8 - bitsToOr;
                }
                bitsToOr = Math.min( (natChunkSize - outBits), 8 );
                outMask = ( 0xff >>> (8 - bitsToOr) );
            } //for
            if ( outBits > 0 ) {                //the working chunk is non-empty
                this.dig.push( outChunk );
            }
            return this;
        } //BigNat
        ////////////////
        function bnBitWidth() {
        //returns the number of significant bits in the bigNat
            var topChunk,
                topBits = 0,
                thisLast = this.dig.length - 1;
            if ( thisLast < 0 ) {
                return 0;
            }
            topChunk = this.dig[thisLast];
            do {
                topChunk >>>= 1;
                topBits++;
            } while ( topChunk !== 0 ); 
            return ( topBits + (thisLast * natChunkSize) );               
        } //bnBitWidth
        ////////////////
        function bnClone() {
        //make a new instance whose value is equal to the value of 'this'.
            var newNat = new BigNat();
            newNat.dig = this.dig.concat();
            return newNat;
        } //bnClone
    ////////////////
        function bnAdd( natA ) {
        //add a bigNat to 'this': works when input is ALSO 'this'... (i.e. an easy way to shift north)
            var ii, cc, bothSize, workArr, tempSum,
                    thisDig = this.dig,
                    thisLen = thisDig.length,
                    inDig = natA.dig,
                    inLen = inDig.length;
        //First, let's make them the same length: if 'this' is the longer, then
        //let's make our input longer, otherwise the other wise...
            if ( ( ii = (thisLen - inLen) ) > 0 ) {
                bothSize = thisLen;
                workArr = inDig.concat();
                for ( ; ii > 0; ii-- ) {
                    workArr.push(0);
                } //for
            } else {
                bothSize = inLen;
                for ( ii = inLen - thisLen; ii > 0; ii-- ) {
                    thisDig.push(0);
                }
                workArr = inDig;            
            }
        //Now let's add, little end to big, digit by digit ...
            for ( ii = 0, cc=0; ii < bothSize; ii++ ) {
                tempSum = thisDig[ii] + workArr[ii] + cc;
                cc = ( tempSum & natOverFlowTest ) ? 1 : 0;
                thisDig[ii] = (tempSum & natDigitMask);             
            } //for
        //Now, did we carry out of the last position?
            if ( cc ) {
                thisDig[ii] = cc;
            }
            return this;
        } //bnAdd
    ////////////////
        function bnSubtract( natA ) {
        //subtract the input bigNat from 'this'; assumes  'this' >= 'natA'.
            var ii, bb, workDig, tempDiff,
                    thisDig = this.dig,
                    thisLen = thisDig.length;
        //First, let's extend our input array, if necessary...
            if ( (ii = thisLen - natA.dig.length) ) {
                workDig = natA.dig.concat();
                for ( ; ii > 0; ii-- ) {
                    workDig.push(0);
                }
            } else {
                workDig = natA.dig
            }
        //Now let's subtract, little end to big, digit by digit ...
            for ( ii = 0, bb=0; ii < thisLen; ii++ ) {
                tempDiff = thisDig[ii] - workDig[ii] - bb;
                bb = ( tempDiff < 0 ) ? 1 : 0;
                thisDig[ii] = (tempDiff & natDigitMask);             
            } //for
        //Since the input is smaller than 'this', we should have no
        //borrow out of the final postion.
            this.trim();
            return this;
        } //bnSubtract
    ////////////////
        function bnTrim() {
        //used after an affecting operation: disgards high-level 0 digits
            var ii,
                    inDig = this.dig;
            for ( ii = (inDig.length - 1); ii >=0; ii -= 1 ) {
                if ( inDig[ii] !== 0 ) {
                    break;
                } //for
                inDig.pop();
            } //for
            return this;
        } //bnTrim
    ////////////////
        function bnLow() {
        //return 'this' lowest 8 bits as a number
        //a zero BigNat produces 0
            if ( this.dig.length === 0 ) {
                return 0;
            }
            return ( (0 + (this.dig[0] & 0xff) ) );
        } //bnLow
    ////////////////
        function bnCompare( natA ) {
        //returns -1 if  'this' < input, 0 if they are equal, 1 if  'this' > input.
            var ii, ddiff,
                    thisDig = this.dig,
                    inDig = natA.dig,
                    thisLen = thisDig.length;
            if ( (ddiff = (thisLen - inDig.length)) !== 0 ) { //if lengths are different, we're done
                return (ddiff < 0) ? -1 : 1;
            }
            for ( ii = thisLen - 1; ii >= 0; ii -= 1 ) {
                ddiff = thisDig[ii] - inDig[ii];
                if ( ddiff === 0 ) {
                    continue;
                }
                return (ddiff < 0) ? -1 : 1;
            } //for
            return 0;
        } //bnCompare
    ////////////////
        function bnDown() {
        //shift the value down 1 bit: low-order bit is lost,
        //high-order bit is replaced with zero.
            var ii,
                    oldBBit = 0,
                    newBBit = 0,
                    thisDig = this.dig,
                    ownLast = thisDig.length - 1;
            if ( ownLast < 0 ) {                //it's empty, no effect
                return this;
            }
        //take it from the top:
            if ( thisDig[ownLast] > 1 ) {         //we'll not be shifting out of top chunk
                oldBBit = ( ( thisDig[ownLast] & 1 ) ? natChunkHighBit : 0 );
                thisDig[ownLast] >>>= 1;
            } else {                                            //losing top chunk: must be == 1, else chunk would not have been there
                if ( ownLast === 0 ) {              //out to nothing...
                    thisDig = [];
                    return this;
                }
                thisDig.pop();                               //lose the top chunk
                ownLast -= 1;
                oldBBit = ( ( thisDig[ownLast] & 1 ) ? natChunkHighBit : 0 ); //the new top bit of the next lower chunk
                thisDig[ownLast] = ( (thisDig[ownLast] >>> 1) | natChunkHighBit ); //since a 1 must have shifted in   
            } //end else
        //top chunk is shifted, and we have a value for the previous bottom bit:
            for ( ii = ownLast - 1; ii >=0; ii -= 1 ) {
                newBBit = ( thisDig[ii] & 1 );
                thisDig[ii] = ( (thisDig[ii] >>> 1) | oldBBit );       //previous bottom (shifted) goes to current top
                oldBBit = ( (newBBit) ? natChunkHighBit : 0 );
            } //for    
            return this;
        } //bnDown
    ////////////////
        function bnUpN( n ) {
        //shift 'this' n bits in the direction of greater significance
            var ii, newChunks, spareBits,
                    thisDig = this.dig,
                    thisLen = thisDig.length;
        //First, let's move everybody up the spare bits after dividing by chunk size
        //We'll do it by successive doublings ...
            spareBits = ( n % natChunkSize );
            for ( ii = 0; ii < spareBits; ii += 1 ) {        //slightly costly way of getting this * (2**n)
                this.add( this );
            } //for
        //Now, let's do the easy part: add whole chunks to the low side...
            newChunks = Math.floor( n / natChunkSize );
            for ( ii = 0; ii < newChunks; ii += 1 ) {
                thisDig.unshift(0);
            } //for
            return this;
        } //bnUpN
    ////////////////
        function bnMod( theMo ) {
        //'this' is replaced with its residue mod 'theMo'.
        //(this routine is slick but, I think, slow ...)
            var ii,
                    moBits = theMo.bitWidth();
            while ( this.compare( theMo ) > 0 ) {
                if ( (ii = this.bitWidth() - moBits - 1) > 0 ) {        //shift before subtract?
                    this.subtract( theMo.clone().upN(ii) );             //shift to 1 bit below this top
                } else {
                    this.subtract( theMo );
                }
            } //while
            return this;
        } //bnMod
    ////////////////
        function bnStartBitWalker() {
        //start (or restart) the bitWalker at 0: this counter is then
        //used by bnNextBit.
            this.chunkLeft = 0;
            this.chunkIdx = 0;
            return this;            
        } //bnBitWalker
    ///////////////
        function bnNextBit() {
        //returns the next bitWalker bit, or 0 after bitstring end;
        //advances to next bit, if any (remember -- we're moving
        //UP significance, so 0's after the most significant bit are
        //not a lie ...)
            var retBit;
            if ( this.chunkLeft <= 0 ) {
                //get a new chunk...
                if ( this.chunkIdx >= this.dig.length ) {      //all done?
                    return 0;
                }
                this.chunkCurrent = this.dig[this.chunkIdx];
                this.chunkIdx += 1;
                this.chunkLeft = natChunkSize;
            }
            retBit = (this.chunkCurrent & 1) ? 1 : 0;
            this.chunkCurrent >>>= 1;
            this.chunkLeft -= 1;
            return retBit;           
        } //bnNextBit
    ///////////////
        function bnToArray() {
        //returns the bit string as an octet array, in big-endian order
            var chunkLeft = 0,
                cChunk = 0,
                nextIdx = 0,
                thisDig = this.dig,
                thisLen = thisDig.length;
            function _get1() {
                var newBit;
                if ( chunkLeft <= 0 ) {
                    if ( nextIdx >= thisLen ) {
                        return -1;
                    }
                    cChunk = thisDig[nextIdx];
                    chunkLeft = natChunkSize;
                    nextIdx += 1;
                } //if
                //at this point, chunkLeft > 0 ...
                newBit = ( cChunk & 1 );
                cChunk >>>= 1;
                chunkLeft -= 1;
                return newBit;
            } //_get1
            function _get8() {
                var bitLoc = 0,
                        theByte = 0,
                        nextBit = 0;
                while ( bitLoc < 8 ) {
                    if ( (nextBit = _get1()) < 0 ) {
                        return ( (bitLoc === 0) ? -1 : theByte );
                    }
                    if ( nextBit ) {
                        theByte |= ( 1 << bitLoc );
                    }
                    bitLoc += 1;                
                } //while
                return theByte;
            } //_get8
            var ii, next8,
                    outArr = [];
            while (  ( next8 = (0 + _get8()) ) >= 0  ) {
                outArr.push( next8 );
            } //while
            //clean out the high-order 0's...
            for ( ii = outArr.length - 1; ii >=0; ii-- ) {
                if ( outArr[ii] != 0 ) {
                    break;
                }
                outArr.pop();
            } //for
            //the order is little-endian: let's reverse that...
            outArr.reverse();
            return outArr;           
        } //bnToArray
    ////////////////
        function bnToString( noSpace ) {
        /*
            'this' bigNat will be printed as a hex string in big-endian order, with a space before every 2 digits
            If  'noSpace' === 'true', then the string is continuous, with no separating spaces.

            In either case, each 8 bits of bigNat is represented by 2 hex digits (possibly one or both being 0)
        */
            var ii, outOct, next8,
                    outStr = '',
                    workArr = this.toArray(),
                    workLen = workArr.length,
                    joinChar = ( ( noSpace ) ? '' : ' ' );
            for ( ii = 0; ii < workLen; ii++ ) {
                next8 = workArr[ii];
                outStr += ( joinChar + ( (next8 < 0x10) ? ( "0" + next8.toString(16) ) : next8.toString(16)  ) );                
            } //for
            return outStr;
        } //bnToString
    ////////////////
        function bnShowValue() {
        //for testing: dumps the hex values, in their (little-endian) order,
        //of the bigNat's chunks
            var ii,
                sepChar = ' ',
                thisDig = this.dig,
                thisLen = thisDig.length,
                outStr = '';
            for (ii = 0; ii < thisLen; ii += 1 ) {
                outStr += (thisDig[ii] & 0x3ffffff ).toString(16) + sepChar;
            }
            return outStr;
        } //bnShowValue
        BigNat.prototype.bitWidth = bnBitWidth;
        BigNat.prototype.clone = bnClone;
        BigNat.prototype.startBitWalker = bnStartBitWalker;
        BigNat.prototype.nextBit = bnNextBit;
        BigNat.prototype.toArray = bnToArray;
        BigNat.prototype.toString = bnToString;
        BigNat.prototype.showValue = bnShowValue;
        BigNat.prototype.add = bnAdd;
        BigNat.prototype.subtract = bnSubtract;
        BigNat.prototype.mod = bnMod;
        BigNat.prototype.down = bnDown;
        BigNat.prototype.upN = bnUpN;
        BigNat.prototype.trim = bnTrim;
        BigNat.prototype.low = bnLow;
        BigNat.prototype.compare = bnCompare;
        PKI.pkiBigNat = BigNat;
    } () ); //BigNat
    /* ----------------------------------------------------------------------------------------- */
/* **********************************************************************************************
                                             MONTGOMERY

    Peter Montgomery invented one of the techniques for doing, manageably in space
    and time, the numerical manipulation that RSA encrypt and decrypt require. First,
    we need to be able to add, subtract, take the modulus of, and bit-shift positive
    integers of arbitrary size. Hence 'BigNat'. Montgomery gives us multiplication, but
    in such a way that we never get too big, because everything is modulo a given value.

    How useful, though, is THAT? Well, RSA wants a raising to a power (that is, a repeated
    multiplication), then a modulo. It turns out you can do modulo before, during, and after
    all those multiplies, to keep things reasonably in bounds.

    But wait -- there's more! Using the Montgomery reduction, these multiplies under modulo
    basically amount to single bit shifts and selective additions, so they're pretty cheap. (Though,
    true, there are LOTS of them ...)

    'Monty' is the new type we introduce, built upon 'BigNat', but with a special sauce that makes
    all this stuff work nicely. It will be the basic type used in the RSA routine to do public-key
    encryption.

*********************************************************************************************** */
    PKI.pkiMontgomery = function( theModulus ) {
    /*
        The initialization of the system to set up Montgomery: it returns the constructor.
        'theModulus' should be a bitstring in big-endian octet array format.
    */
        var _MOD, _BITSHIFT,
                BigNat = PKI.pkiBigNat;
///////////////
        function Monty( octArr ) {
        /*
            The constructor: it is returned by the initialization routine 'Montgomery'.
        
            input: a big-endian octet array;
            output: a Monty. A what?
                A Monty is, basically, ('aBigNat' north-shifted _BITSHIFT bits) mod _MOD.
                (I know: true but not enlightening. What can I say?)
        */
            if ( typeof octArr === "object" ) {
                this.nat = new BigNat( octArr ).upN( _BITSHIFT ).mod( _MOD );
            } else {
                this.nat = new BigNat();
            }
            return this;
        } //Monty
///////////////
        function montyClone() {
        //produce an identical Monty to 'this'
            var mClone = new Monty();
            mClone.nat = this.nat.clone();
            return mClone;
        } //montyClone
///////////////
        function montyMultiply( mTimes ) {
        /*
            input: 2 Monties, 'this' and the multiplier 'mTimes' ('mTimes' may also be 'this')
            output: 'this' becomes: their product divided by 2**_BITSHIFT, modulo _MOD
            
            The procedure uses the Mongomery reduction: mB is used, bit by bit, to multiply mA, with
            possible adding-in of _MOD to get low-order 0, then right shift the accumulating product, natP. This continues
            for _BITSHIFT bits (possibly filling mTimes w/0's at the top). The product is also, as each of the inputs is,
            modulo _MOD, and has been effectively divided by 2**_BITSHIFT. The product is packaged in the return Monty.
            At each step, one of 4 values will be added into the product: 0, (_MOD + this.nat), _MOD, or this.nat. If the current
            bit of mTimes.nat (timesBit) is 1, then it will either be (_MOD + this.nat) or this.nat, whichever of these will give
            natP a low-order 0. If timesBit is 0, then either 0 (nothing) or _MOD will be added to natP to ensure a low-order 0 bit.
        */
            var ii, adder10, adder11,
                    proNat = new BigNat(),        //will accumulate the 'product'
                    adder01 = _MOD,
                    thisNat = this.nat,                         //this will hold its value; but the property will finally be replaced
                    timesNat = mTimes.nat;
        //first, pre-add:
            if ( thisNat.low() & 1 ) {                   //low-order 1 bit
                adder10 = thisNat.clone().add(_MOD);       //modulus + A: low-order 0
                adder11 = thisNat;
            } else {
                adder10 = thisNat;
                adder11 = thisNat.clone().add(_MOD);
            }
            timesNat.startBitWalker();                  //set current bBit to 0
            for ( ii = 0; ii < _BITSHIFT; ii++ ) { //since timesNat.bitWidth() <= _BITSHIFT, this will catch all the actual timesBits
                if ( timesNat.nextBit() ) {                   //current timesBit is 1
                    if ( proNat.low() & 1 ) {               //accumulator has low-order 1
                        proNat.add( adder11 );
                    } else {
                        proNat.add( adder10 );
                    }
                } else {                                        //current aBit is 0
                    if ( proNat.low() & 1 ) {
                        proNat.add( adder01 );
                    }
                }
                //at this point proNat should have a 0 low bit...
                proNat.down();                            //shift it out
            } //for
            //proNat could have gotten bigger, with all those adds, than the modulus:
            proNat.mod( _MOD );                     //get it back to modulo the modulus
            this.nat = proNat;
            return this;
        } //montyMultiply
///////////////
        function montyUn () {
        //returns a big-endian octet-array of  'this', de-Montied: divided by 2**_BITSHIFT, but still modulo _MOD
            var ii,
                unMonty = this.nat.clone();
            for ( ii = 0; ii < _BITSHIFT; ii++ ) {
                if ( unMonty.low() & 1 ) {
                    unMonty.add( _MOD );
                }
                unMonty.down();
            } //for
            return unMonty.toArray();            
        } //montyUn
///////////////
        function montyToString( noSpace ) {
        //for testing: a hex string, big-endian, of the contained BigNat
        //If  'noSpace' === 'true', then the string is continuous, with no separating spaces.
            return this.nat.toString( noSpace );
        } //montyToString
///////////////
        Monty.prototype.clone = montyClone;
        Monty.prototype.multiply = montyMultiply;
        Monty.prototype.un = montyUn;
        Monty.prototype.toString = montyToString;
///////////////
        _MOD = new BigNat( theModulus );
        _BITSHIFT = _MOD.bitWidth();
        return Monty;
    }; /////////////////////////////////////Montgomery///////////////////////////////////////////////
///////////////
/* **********************************************************************************************
                                                        RSA

    Well, this is it: initialize the routine with the RSA public key, then encrypt data using
    it. This encrypted data can then be decrypted by any system that supports pki, given
    the private key corresponding to the public key used here.

    Initially, this must parse the key, which is in ASN.1 format, in order to get the modulus
    and exponent. These are then used for encryption, where Montgomery and BigNat
    are required.
********************************************************************************************** */
    (function () { /////////////////////////////////RSA/////////////////////////////////////
        var _keySize,                //trimmed byte width of the modulus
                _keyExp,               //this will be a BigNat
                Monty;                  //the Mongomery constructor
        PKI.pkiRSAinit = function ( thePEM ) {
        /*
            set up for RSA public-key encryption. This returns the encrypting function, which, itself,
            takes a single parameter:  the unencrypted octet-array, of length no greater than the allowed length.
            The allowed length value is a property ("allowedLength") of the returned function. Thus, e.g.,
            
              encrypt = pkiRSAinit( thePEM );
              if ( plainArr.length <= encrypt.allowedLength ) {
                  cryptArr = encrypt( plainArr );
              }
            
            'thePEM' is the RSA public key with the key's information embedded within, in a base64-encoded
            ASN.1-format bitstring. (Why "PEM"? Stands for "privacy-enhanced mail", where base64 was first used.)
        */
            var ii, 
                    workStr, convWork,
                    bitStr,
                    dOID, dModulus, dExponent,
                    pubkeyArr, meArr,
                    returnFunc = _encrypter,
                    inLen = thePEM.length;

		    if ( 
                   (inLen < 50) ||
                   (thePEM.substr(0,26) != "-----BEGIN PUBLIC KEY-----") ||
		           (thePEM.substr(inLen - 24) != "-----END PUBLIC KEY-----") 
                ) {
                throw "rsaInit: Not a Public Key";
            }
		    workStr = thePEM.substr( 26, (inLen - 50) );
            convWork = workStr.j45debase64('+/=');
            pubkeyArr = PKI.asn1Parse( convWork );
            //As this is supposed to be a public key, we expect the OID at a certain place://
            try {
                dOID = pubkeyArr[0][0][0];
                bitStr = pubkeyArr[0][1];
            } catch (e) {
                throw "rsaInit: not a Public Key";
            }
            if ( !dOID.value || ((dOID.tag & 0x1f) != 0x06) ) {
                throw new Error("rsaInit: Bad format for Public Key (no OID)");
            }
            if ( dOID.value.j45indexOf( [ 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d ] ) == -1 ) {
                throw new Error("rsaInit: Not an RSA public key");
            }
            if ( !bitStr.value || ((bitStr.tag & 0x1f) != 0x03) ) {
                throw new Error("rsaInit: Bad format for Public Key (no bit string)");
            }
            //this particular bit string is an asn.1 structure, after its initial byte, which is 0--indicating that
            //ALL the bits of the bitstring's final byte are being used. Thus, let's get rid of the initial byte,
            //and parse the asn.1 stuff that remains...
            meArr = PKI.asn1Parse( bitStr.value.slice(1) );
            dModulus = meArr[0][0];
            if ( !dModulus.value || ((dModulus.tag & 0x1f) != 0x02) ) {
                throw new Error("rsaInit: Bad format for Public Key (no modulus)");
            }
            dExponent = meArr[0][1];
            if ( !dExponent.value || ((dExponent.tag & 0x1f) != 0x02) ) {
                throw new Error("rsaInit: Bad format for Public Key (no exponent)");
            }
            Monty = PKI.pkiMontgomery( dModulus.value );        //get the Montgomery constructor
            _keySize = dModulus.value.length;                             //start with this ...
            for ( ii = 0; ii < _keySize; ii++ ) {
                if ( dModulus.value[ii] != 0 ) {
                    break;
                }
            } //for
            _keySize -= ii;                                                             //let's lose the high-order 0's
            _keyExp = new PKI.pkiBigNat( dExponent.value );      //the Exponent COULD be REALLY big (?)
            if ( _keyExp.bitWidth() === 0 ) {
                throw new Error( "pkiRSAinit: exponent is 0" );
            }
            returnFunc.allowedLength = (_keySize - 11);
            return returnFunc;
        }; //pkiRSAinit
        function _encrypter ( thePlainArr ) {
        /*
            The input -- an octet array: it will be padded at the front to the size (in bytes) of the modulus,
            according to PKCS#1 (as detailed in RFP3447): 0,2,8 or more ps-random-non-zeros,0. Thus, the
            actual data can be no longer than modulus-size - 11. This maximum value is the 'allowedLength'
            property of this function when it is returned by pkiRSAinit. Thus, after a (e.g. PHP) decryption,
            using the "NO_PADDING" option, one must bypass this padding to get the real data.

            The output is an octet array of modulus length. (The encrypted value is a byte-array rather than a
            byte-string, but in the proper order for, e.g. base64 translation.)         
        */
            var ii, thePad, powerM, accuM, workArr,
                    expWidth = _keyExp.bitWidth(),                   //how many powers of 2 to do (we know it's > 0)
                    padArr = [],
                    inLen = thePlainArr.length;
		    if ( (thePad = (_keySize - inLen)) < 11 ) {
			    throw "pkiRSAencrypt: input too long (at " + inLen + " bytes) for key";
            }
            padArr.push(0, 2);                                                      //the first two padding bytes
            for ( ii = _keySize - inLen - 3; ii > 0; ii-- ) {               //the pseudo-random middle
                padArr.push( Math.floor(255 * Math.random()) + 1 );
            }
            padArr.push(0);                                                         //and null ends it
            workArr = padArr.concat( thePlainArr );     //this gives us a padded array of modulus length
            //It's time for the RSA move: take the plain bit string to the exponent power modulo the modulus:
            powerM = new Monty( workArr );              // this will be successively squared
            accuM = new Monty( [1] );                           // this will accumulate (muliplicatively) the answer
            _keyExp.startBitWalker();                             //will start with bit 0 of the exponent
            //The point of all the Monty and BigNat machinery is this loop ...            
            for ( ii = expWidth; ii > 1; ii-- ) {
                if ( _keyExp.nextBit() & 1 ) {                //is this power of 2 represented?
                    accuM.multiply( powerM );           //multiply our power into the accumulator
                }
                powerM.multiply( powerM );            //square the current power
            } //for
            //the last one: no need to do the new squaring:
            if ( _keyExp.nextBit() & 1 ) {
                accuM.multiply( powerM );
            }
            //We're done: let's de-Montify and return the octets
            return accuM.un();
        } //_encrypter
    }() ); /////////////////////////////RSA/////////////////////////////////////////////////////
/* **********************************************************************************************
                                    RANDIT

    The place to place random-bit generators. 'randIt' seems pretty good: real randomness,
    not pseudo-randomness: it takes advantage of the chitter that is associated with
    interval timing (as the browser cannot control when it is pre-empted and so on...).
    Of course, it's slow (~1ms / bit) and leaves a lot of entropy on the table. So, to get a
    128-bit AES key, for example, would take > 128ms. As long as it is only used about
    once/session, though, that should be fast enough.

*********************************************************************************************** */
    (function () {
    ////////////////
        var spinInterval = 1;
    ////////////////////
        function _loopy( theSeed ) {
            var ii,
                theCount = 0,
                    thePushcount = ( theSeed % 9 ),
                    theBeard = [],
                    start_mSec = Date.now(),
                    end_mSec = start_mSec + spinInterval;
            while ( Date.now() < end_mSec ) {
                for ( ii = 0; ii <= thePushcount; ii++ ) {
                    theBeard.push( ii );
                }
                theCount++;
                theBeard = [];
            } //while
            return theCount;
        } //_loopy
        PKI.randIt = function ( theBytes ) {
        /*
            Returns an octet-array with the requested number of bytes: in effect
            a random bitstring 8*theBytes long.

            This routine is profligate of time and entropy: it takes spinInterval (1) msecs
            per random bit. Works pretty well, though, and since -- ideally -- it is used but
            once per session, for no more than 256 bits or so, its .26 sec  should go practically
            unnoticed -- especially since it typically feeds into an even-more-leisurely public-key
            encryption.
        */
            var ii, workingByte, currentCount,
                    bitsNeeded = theBytes * 8,
                    previousCount = 0,
                    totalOnesOut = 0,
                    outArr = [];
            for ( ii = 0, workingByte=0; ii < bitsNeeded; ii++ ) {
                currentCount = _loopy( ii );
                workingByte |= ( (currentCount ^ previousCount) & 1 );
                if ( ( (ii + 1) % 8 === 0 ) ) {
                    outArr.push(workingByte);
                    workingByte = 0;
                } else {
                    workingByte <<= 1;
                }                
                previousCount = currentCount;
            } //for
            return outArr;       
        } //randGet
    }() ); ///////// RANDIT //////////
} () ); //pki

