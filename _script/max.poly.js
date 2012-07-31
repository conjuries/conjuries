/*
    The routines contained herein are Copyright 2012 J. R. McCall.

    This library is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version: http://www.gnu.org/licenses/gpl.html.

    This group of programs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/
var j45;
j45 || (j45 = {});
j45.POLY || (j45.POLY = {});
(function() {
    'use strict';
    var POLY = j45.POLY;
/* **********************************************************************************************
                                               POLYNOMIAL

    The following routines effect a system that allows for the definition and manipulation of 
    polynomials of arbitrary degree and number of variables.

********************************************************************************************** */
    var _thePro_ = {};
/*
    (Useful, but not needed...)
    function __natCheck( aValue ) {
    //fails if the (string) input is not a decimal-format natural number
        return /^\d+$/.test(aValue);
    } //__natCheck
*/
    function __isInt(n) {
    //checks whether a number is an integer
       return (n % 1 === 0);
    } //__isInt

    function __compTerms( term1, term2 ) {
    /*
        Returns 0 if terms (of equal length) are equal, -1 if first
        is "less" than second (that is, precedes it in the ordinary
        ordering of polynomial terms), 1 otherwise. REMEMBER that we
        want reverse order: large terms before small. Confusing? Its
        virtue is that it can be used with the array-sort function.
    */
        var ii,
            tLen = term1.length;
        for ( ii = 0; ii < tLen; ii++ ) {
            if ( term1[ii] === term2[ii] ) {
                continue;
            }
            return (term1[ii] > term2[ii]) ? -1 : 1;
        } //for
        return 0;
    } //__compTerms

    function _vMerge( vArr1, vArr2 ) {
    /*
        Merges 2 variable arrays, putting the names into string order.
        Each input array is assumed to be already in such order.
        Returns a new merged array of variable-names.
    */
        var compResult,
            ii = 0,
            jj = 0,
            L1 = vArr1.length,
            L2 = vArr2.length,
            _mrgArr = [];

        while ( (ii < L1) || (jj < L2) ) {
            if ( ii === L1 ) {
                _mrgArr.push( vArr2[jj] );
                jj++;
                continue;
            }
            if ( jj === L2 ) {
                _mrgArr.push( vArr1[ii] );
                ii++;
                continue;
            }
            compResult = vArr1[ii].localeCompare( vArr2[jj] );
            if ( compResult === 0 ) {
                _mrgArr.push( vArr1[ii] );
                ii++;
                jj++;
                continue;
            }
            if ( compResult < 0 ) {
                _mrgArr.push( vArr1[ii] ); 
                ii++;
            } else {
                _mrgArr.push( vArr2[jj] ); 
                jj++;
            }
        } //while
        return _mrgArr;
    } //_vMerge

    function _expandPo( thePo, newVArr ) {
    /*
        Expands the input polynomial to accommodate the (possibly) expanded
        variable array that is given. The supplied variable array must be in
        text order, and include all the variable names in the existing array.
    */
        var ii, jj, currName,
            tL = thePo.termArr.length,
            oldVArr = thePo.varArr,
            oldVL = oldVArr.length,
            newVL = newVArr.length,
            modelArr = [];
        /*
            Build a model, showing where the old vars belong in the new var array
        */
        for ( ii = 0; ii < oldVL; ii++ ) {
            currName = oldVArr[ii];
            for ( jj = modelArr.length; ( currName.localeCompare(newVArr[jj]) > 0 ); jj++ ) {
                modelArr.push(-1);
            }   //forfor
            /*
                Remember, 'currName' must be in the new array, so, at this point,
                currName === newVArr[jj].
            */
            modelArr.push(0);
        } //for
        /*
            At this point, we are out of old variables. Are there still new ones?
            The length of the model array gives the progress thru the new...
        */  
        for ( ii = modelArr.length; ii < newVL; ii++ ) {
            modelArr.push(-1);
        } //for      
        //Now we have the template: expand the terms in place:
        for ( ii = 0; ii < tL; ii++ ) {
            for ( jj = 0; jj < newVL; jj++ ) {
                if ( modelArr[jj] < 0 ) {       //if no old variable occupies this spot
                    thePo.termArr[ii].splice( jj, 0, 0 ); // just insert a 0 here
                }
            } //forfor
        } //for
        //Now to update our input poli's varArr:
        thePo.varArr = newVArr.concat(); //concat works, since it's just copying strings
        return thePo;
    } //_expandPo


    function _pMerge( poRes, poIn ) {
    /*
        Merge 2nd polynomial into first. Assumes terms are of equal width, and
        variable lists are the same.
    
        If any term drops out (indicating cleaning might be needed), returns 'false',
        otherwise 'true'.
    */
        var compResult, conSum, currPush,
            returnVal = true,
            ii = 0,
            jj = 0,
            L1 = poRes.termArr.length,
            L2 = poIn.termArr.length,
            finArr = [],
            newConArr = [],
            t1Arr = poRes.termArr,
            t2Arr = poIn.termArr;


        while ( (ii < L1) || (jj < L2) ) {
            if ( ii === L1 ) {
                currPush = t2Arr[jj].concat();
                currPush._con = t2Arr[jj]._con;
                finArr.push( currPush );
                jj++;
                continue;
            }
            if ( jj === L2 ) {
                currPush = t1Arr[ii].concat();
                currPush._con = t1Arr[ii]._con;
                finArr.push( currPush );
                ii++;
                continue;
            }
            /*
                Remember: these terms are laid out large to small, but '__compTerms' gives back
                the larger term as "less than". (Shall we just call it "earlier than"?). Remember,
                also, that each poly contributes only one term of a given species (i.e. distribution
                of powers among the variables), so if two of them match, and their constants are then
                added, and the combined term merged (or dropped if the constant has gone to 0), we can
                be confident that no other terms of that species will be coming along.
            */
            compResult = __compTerms( t1Arr[ii], t2Arr[jj] );
            if ( compResult < 0 ) {
                currPush = t1Arr[ii].concat();
                currPush._con = t1Arr[ii]._con;
                finArr.push( currPush );
                ii++;
                continue;
            }
            if ( compResult === 0 ) {
                if ( (conSum = t1Arr[ii]._con + t2Arr[jj]._con) === 0 ) {
                    ii++;
                    jj++;
                    returnVal = false;                  //oops! lost a term type!
                    continue;
                }
                currPush = t1Arr[ii];
                currPush._con = conSum;
                finArr.push( currPush );
                ii++;
                jj++;
                continue;
            }
            currPush = t2Arr[jj].concat();
            currPush._con = t2Arr[jj]._con;
            finArr.push( currPush );
            jj++;
        } //while
        poRes.termArr = finArr;
        return returnVal;
    } //_pMerge

    function _tCombine( thePo ) {
    /*
        Combines like terms in 'thePo'. Returns 'true' if no term-combining produced a zero-coefficient term,
        'false' if some term type dropped out. NOTE THAT THIS ALSO RETURNS FALSE IF WE MERELY LOST THE CONSTANT
        TERM. At this time, I don't feel like checking that the array of any dropped term was all 0's (i.e. was
        simply a constant), since this routine runs too often.
    */
        var oldTerm, newTerm,
            returnVal = true,
            tArr = thePo.termArr,
            newTArr = [];

        if ( tArr.length === 0 ) {       //nothing to do
            return thePo;
        }
        /*
            First, sort the term array. After this, combine
            terms as they are equal...
        */
        tArr.sort( __compTerms );
        oldTerm = tArr.shift();

        while ( tArr.length > 0 ) {
            newTerm = tArr.shift();
            if ( __compTerms(oldTerm, newTerm) === 0 ) {   //terms equal?
                oldTerm._con += newTerm._con;         //add in the constant
            } else {
                if ( oldTerm._con === 0 ) {             //do we drop a term here?
                    returnVal = false;
                    oldTerm = newTerm;
                    continue;
                }
                newTArr.push( oldTerm );
                oldTerm = newTerm;
            }
        } //while
        /*
            At this point, an 'oldTerm' is yet to be added. But, it could have a 0 coefficient...
        */
        if ( oldTerm._con !== 0 ) {
            newTArr.push( oldTerm );
        } else {
            returnVal = false;          //we drop a term
        }

        thePo.termArr = newTArr;

        return returnVal;
    } //_tCombine

    function _pClean( aPoly ) {
    /*
        Removes unused variables from 'aPoly's variable list, and adjusts the
        term array accordingly. Returns 'aPoly'.

        No terms will drop out, as each term is unique, and is either the constant
        or contains one or more variable non-zero powers.
    */
        var ii, jj, currTerm,
            tArr = aPoly.termArr,
            tL = tArr.length,
            vArr = aPoly.varArr;

        ii = 0;
        while ( ii < vArr.length ) {
            for ( jj = 0; jj < tL; jj++ ) {
                if ( tArr[jj][ii] !== 0 ) {
                    break;
                }
            } //for
            if ( jj < tL ) {            //ok--this variable is in use...
                ii++;                   //bump to next variable
                continue;
            }
            /*
                At this point, we'll excise the ii'th variable from term
                and variable arrays.
            */
            for ( jj = 0; jj < tL; jj++ ) {
                tArr[jj].splice(ii,1);
            } //for
            vArr.splice(ii,1);      //now, without bumping, ii points to the next variable
            // The 'while' loop check should still work.
        } //while
        return aPoly;
    } //_pClean
/*************************************************************************************
*************************************************************************************/
    function poMake( aConstant /*, list of variables: aName, aPower, aName, aPower, ...*/ ) {
    /*
        This is the constructor, but DOES NOT TAKE 'new': it creates a one-term polynomial.
        To create a multi-term polynomial, employ the 'poAdd' function. The constant can be
        a floating point number and each of the power terms must be a positive integer specified
        in decimal format. The names are case-insensitive, and will be taken to lower-case.

        Entering only a constant creates a polynomial of constant value. Entering nothing, or only
        0 creates a constant polynomial of value 0 (but with no terms!). If 0 is entered as the
        constant when there is also a non-empty list of names and powers, it throws an error.

        The poMake object consists of the following properties:
            varArr --  an array holding the variable names used in the poly
            termArr -- an array of arrays of powers per variable:
                        if '["u", "v"] is 'varArr', and an element of 'termArr'
                        is '[1, 3]', then the term is 'kuv**3' where 'k'
                        is the constant, held in the '_con' property of
                        each element of 'termArr'.

        Numbers should come in as numbers, not as quoted strings in number format.
    */
        var _thus_, ii, jj, aP, aN, numV, compareResult,
            vpArr = [],
            argL = arguments.length,
            numVars = 0;

        _thus_ = Object.create( _thePro_ );
        _thus_.varArr = [];
        _thus_.termArr = [];

        if ( argL === 0 ) {
            return _thus_;
        }
        //an even number of variable pairs only if an odd number of inputs
        if ( !(argL & 1) ) {
            throw (new Error('Incomplete input.'));
        }
        if ( typeof aConstant !== 'number' ) {
            throw (new Error('Bad Constant'));
        }
        if ( (aConstant === 0) ) {
            if ( argL > 1 ) {      //cannot have variables with a 0 coefficient
                throw ( new Error('variable term has 0 coefficient') );
            }
            return _thus_;
        }

        _thus_.termArr[0] = [];
        _thus_.termArr[0]._con = aConstant;

        for ( ii = 1; ii < argL; ii += 2 ) {
            aN = arguments[ii];
            if (typeof aN !== 'string') {
                throw (new Error('Bad Variable Name'));;
            }
            aP = arguments[ii+1];
            if ( (typeof aP !== 'number') || !__isInt(aP) || (aP === 0) ) {
                throw new Error('Power of "' + aN + '" is not a positive integer');
            }
            aN = aN.toLocaleLowerCase();

            for ( jj = 0; jj < numVars; jj++ ) {
                //if the new name is 'less' than the one looked at, insert it
                if ( (compareResult = aN.localeCompare(vpArr[jj]._nm)) < 0 ) {
                    vpArr.splice( jj, 0, {_nm:aN,_num:aP} );
                    numVars++;
                    break;
                }
                //if they are equal, then dupe variable names: error
                if ( compareResult === 0 ) {
                    throw new Error('Repeated "' + aN + '" as a variable name');
                }
            } //for
            if ( jj === numVars ) {
            //gets here if name is 'greater' than names already enlisted
                vpArr.push( {_nm:aN,_num:aP} );
                numVars++;
            }
        } //for
        /*
            This is going to be a one-term polynomial. If 'numVars' is still 0,
            then it's a constant, with an empty variable array and an empty array
            for the term. Otherwise, let's build the polynomial's variable array,
            and its one term's array...
        */
        for ( ii = 0; ii < numVars; ii++ ) {
            _thus_.varArr.push( vpArr[ii]._nm );        //the variable array
            _thus_.termArr[0].push( vpArr[ii]._num );    //and the term array
        } //for
        return _thus_;
    } //poMake

    function poClone() {
    //clone 'this'. Returns the copy.
        var ii,
            tArr = this.termArr,
            tL = tArr.length,
            theClone = poMake();

        theClone.varArr = this.varArr.concat();
        theClone.termArr = [];
        for ( ii = 0; ii < tL; ii++ ) {
            theClone.termArr.push( tArr[ii].concat() );
            theClone.termArr[ii]._con = tArr[ii]._con;
        } //for
        return theClone;
    } //poClone

    function poPlus( poA ) {
    /*
        Add a poly or number to 'this': works when input is ALSO 'this'.
        A NOTE on the order of terms: "Biggest" terms first, based on the degrees of the
        involved variables, using their native ordering to decide. Thus:

            '(x**2)y' precedes 'x(y**3)', which precedes 'xy', which precedes 'y**3',

        and so on. 

        Input must be a polynomial OR a number. If a number, it is added to (or becomes) 'this's
        constant term.
    */ 
        var newVArr,
            tmpPo = poA.clone();
        
        if ( typeof poA === 'number' ) {
            this.plus( poMake(poA) );                   // Just add to this's constant term
            return this;
        }

        if (poA._type != "j45poly") {
            throw (new Error('Plus: Bad Input'));
        }
        newVArr = _vMerge( this.varArr, poA.varArr );
        _expandPo( tmpPo, newVArr );
        _expandPo( this, newVArr );                    //'this' properties get modified

        if ( _pMerge(this,tmpPo) ) {                    //return true means no term dropped out
            return this;
        }
        /*
            At least one term dropped out in the combining: let's clean this guy...
        */
        _pClean( this );
        return this;
    } //poPlus

    function poTimes( poIn ) {
    /*
        Multiplies this by the input, in the usual way. Returns an expanded 'this'.
        The input must be a poly.
    */
        var ii, jj, kk, tmpTArr, tmpCArr, timesTerm, timesCon, thisL, currThisTerm, currThisCon,
            productTermArr, productTerm, conTerm,
            cleanIt = false,
            poInClone = poIn.clone(),
            inL = poInClone.termArr.length,
            newVarArr = _vMerge( poIn.varArr, this.varArr ),
            varL = newVarArr.length,
            accPo = poMake(),       //holds the accumulating terms
            tmpPo = poMake();       //holds the partial product
        /*
            The method here is to take each term of 'poIn' and multiply each of the 'this' 
            terms by it, creating an interim polynomial whose order is correct. This is then
            added into the accumulator.
        */

        if (poIn._type != "j45poly") {
            throw (new Error('Times: Bad Input'));
        }

        if ( (this.termArr.length === 0) || (poIn.termArr.length === 0) ) {
            this.varArr = [];
            this.termArr = [];
            return this;
        }

        _expandPo( this, newVarArr );           //expand the terms
        _expandPo( poInClone, newVarArr );
        thisL = this.termArr.length;
        _expandPo( accPo, newVarArr);           //set up the accumulator
        _expandPo( tmpPo, newVarArr);           // and the partial product
        for ( ii = 0; ii < inL; ii++ ) {
            tmpTArr = [];
            tmpCArr = [];
            timesTerm = poInClone.termArr[ii];       //this is an array of nat. numbers
            timesCon = poInClone.termArr[ii]._con;   //this is a floating point number
            productTermArr = [];

            for ( jj = 0; jj < thisL; jj++ ) {
                currThisTerm = this.termArr[jj];
                currThisCon = this.termArr[jj]._con;
                productTerm = [];
                if ( (conTerm = timesCon * currThisCon) === 0 ) {
                    cleanIt = true;                     //a term dropped out
                    continue;
                }
                for ( kk = 0; kk < varL; kk++ ) {
                    productTerm.push( currThisTerm[kk] + timesTerm[kk] );
                } //forforfor
                /*
                    Given that constants are floating point numbers, it is possible 
                    that multiplying two very small of them together could produce zero
                    (as the product went south off the charts, as it were). 
                */
                productTerm._con = conTerm;
                productTermArr.push( productTerm );    
            } //forfor

            /*
                At this point we should have term and constant arrays
                produced by multiplying one term of the input to the
                corresponding 'this' terms. Let's accumulate them...
            */
            tmpPo.termArr = productTermArr;
            if ( !_pMerge(accPo, tmpPo) ) {       //did we drop a term?
                cleanIt = true;
            }
        } //for
        /*
            Set up this. Perhaps the process dropped one or more terms,
            and it needs cleaning...
        */
        this.termArr = accPo.termArr;
        if ( cleanIt ) {
            _pClean( this );
        }
        return this;
    } //poTimes


    function poPuff( aVar, aPoly ) {
    /*
        Substitutes, in 'this', 'aPoly' everywhere 'aVar' occurs. If 'aVar' is raised
        to a power, then so is 'aPoly' in the puffed-up version. Returns 'this'.

        'aPoly' may not have 'aVar' as one of its variables. Otherwise, it may have any
        variable names, whether or not they are already in 'this'.
    */
        ///////////////////////////////////
        function __powerPuff( aPower ) {
        /*
            Local function to add a needed power of 'aPoly' to an array, if it is
            not already there. If it is, simply returns a reference to it.

            This avoids recalculating a given power of 'aPoly', but is naively done, as,
            to get to a given power, every intermediate one is calculated and saved. This is
            a drag if intermediate powers aren't needed, but I think fairly high powers could
            quickly blow the system anyway...            
        */
            var ii,
                pLast = inPowerArr.length - 1;

            for ( ii = pLast; ii < aPower; ii++ ) {
                inPowerArr.push( aPoly.clone().times(inPowerArr[ii]) );
            } //for

            return inPowerArr[aPower];
        } //__powerPuff
        ///////////////////////////////////
        var ii, jj, tTerm, varPos, newVarArr, varL,
            inPowerArr = [],
            inL = aPoly.termArr.length,
            thisL = this.termArr.length,
            aPolyClone = aPoly.clone(),
            aVL = aPoly.varArr.length,
            accPoly = poMake(),
            productPoly = poMake();

        /*
            Make sure 'aVar' is not in the substitution poly:
        */
        for ( ii = 0; ii < aVL; ii++ ) {
            if ( aVar === aPoly.varArr[ii] ) {
                throw new Error("poPuff: " + aVar + " is in the input polynomial.");
            }
        } //for
        /*
            First merge the variable arrays for the two polys. It still includes
            'aVar', whose entry will be carried along until the end. Also expand
            the two temporary input poly term arrays as well as the product and
            accumulator arrays.
        */
            newVarArr = _vMerge( aPoly.varArr, this.varArr );
            _expandPo( this, newVarArr );
            _expandPo( aPolyClone, newVarArr );
            _expandPo( accPoly, newVarArr );
            _expandPo( productPoly, newVarArr );
            varL = newVarArr.length;
        /*
            Find the position of the input variable:
        */
        for ( ii = 0; ii < varL; ii++ ) {
            if ( aVar === newVarArr[ii] ) {
                varPos = ii;
                break;
            }
        } //for
        if ( ii >= varL ) {
            throw new Error("poPuff: No such variable name.");
        }
        /*
            Now, set up an array of powers of the input. Let's start with the
            constant 1 poly, then the input itself, representing powers 0 and 1. Others
            will be added as needed...
        */
            inPowerArr.push(poMake(1));
            inPowerArr.push(aPolyClone);
        /*
            And now, finally, let's loop through our cloned 'this' term array, 
            combining the term with each term of the proper power of the puffing poly.
            The original 'aVar' will still be in each term that it started in. It will
            not, however, cause extra terms to be created (since the puffing poly does
            not contain it) and the term and variable arrays will be purged of it later...
        */
        var kk, pPtermArr, pPtermL, currPuffTerm, productTerm, currPower,
            productTermArr;

        for ( ii = 0; ii < thisL; ii++ ) {
            tTerm = this.termArr[ii];
            currPower = tTerm[varPos];
            productTermArr = [];

            if ( currPower === 0 ) {     //just use the 'this' term without puffing
                productTermArr.push( tTerm );
                productPoly.termArr = productTermArr;
                _pMerge( accPoly, productPoly );
                continue;               //access the next 'this' term
            }
            //We have a live one...
            pPtermArr = __powerPuff( currPower ).termArr;    //get the properly-powered poly's term array
            pPtermL = pPtermArr.length;
            /*
                At this point, we have the puff polynomial, raised to the
                power of the variable it will substitute for. Let's combine the current
                'this' term with each of the puff's terms, and accumulate...
            */
            for ( jj = 0; jj < pPtermL; jj++ ) {
                currPuffTerm = pPtermArr[jj];
                productTerm = [];
                for ( kk = 0; kk < varL; kk++ ) {
                    productTerm.push( currPuffTerm[kk] + tTerm[kk] );
                } //for
                /*
                    Given that constants are floating point numbers, it is possible 
                    that multiplying two very small of them together could produce zero
                    (as the product went south off the charts, as it were). 
                */
                if ( (productTerm._con = tTerm._con * pPtermArr[jj]._con) === 0 ) {
                    continue;
                }
                productTermArr.push( productTerm );                    
            } //for
            /*
                At this point we should have a term array produced by multyplying the current
                term of 'this' with each term of the (properly-powered) puff's term array.
                Each term will still be different:let's merge them into the accumulator's term array.
            */
            productPoly.termArr = productTermArr;
            _pMerge( accPoly, productPoly );    //adding what we just did into the accumulator   
        } //for
        /*
            The accumulator poly should hold almost what we need. We now need to scrub 'aVar' from each
            term, and from the accumulator's varArr, then combine terms and, finally, clean out any variables (other
            than 'aVar') that might have dropped out but still occupy slots in the variable and term arrays, though
            zero-powered everywhere. Then set accPoly to 'this'.
        */
            var accL = accPoly.termArr.length;
            for ( ii = 0; ii < accL; ii++ ) {
                accPoly.termArr[ii].splice(varPos,1);
            } //for
            accPoly.varArr.splice(varPos,1);
            _tCombine( accPoly );
            _pClean( accPoly );
        /*
            Set up this:
        */
        this.varArr = accPoly.varArr;
        this.termArr = accPoly.termArr;

        return this;
    } //poPuff

    function poScale( aNum ) {
    /*
        Scale a polynomial by multiplying each term by the input number.
        As always in these situations, it could cause terms to be dropped
        as their coefficients went to zero (e.g. too small to represent).
    */
        var ii,
            cleanIt = false,
            thisL = this.termArr.length;

        if ( typeof aNum != 'number' ) {
            throw (new Error('Times: Bad Input'));
        }
        if ( !isFinite(aNum) ) {
            throw (new Error('Times: Bad Input'));
        }

        if ( aNum === 0 ) {
            this.varArr = [];
            this.termArr = [];
            return this;
        }

        for ( ii = 0; ii < thisL; ii++ ) {
            this.termArr[ii]._con *= aNum;
            if ( this.termArr[ii] === 0 ) {
                this.termArr.splice(ii, 1);
                thisL--;
                cleanIt = true;
            }
        } //for
        if ( cleanIt ) {
            _pClean( this );
        }
        return this;
    } //poScale

    function poReduce( aVar, aFloat ) {
    /*
        Assuming 'aVar' is a variable name in 'this', substitutes
        the number 'aFloat' for all instances of the variable within
        'this', so 'this' is rebuilt as a polynomial with one fewer
        variables.

        Returns 'this'. If 'aVar' is not a variable in 'this', 'this'
        is unchanged.
    */
        var ii, subloc, thePower, currCon,
            cleanIt = false,
            vL = this.varArr.length,
            vArr = this.varArr,
            tArr = this.termArr;

        if ( !isFinite(aFloat) ) {
            throw ( new Error('Substitute value is not valid') );
        }

        for ( ii = 0; ii < vL; ii++ ) {
            if ( vArr[ii] === aVar ) {
                break;
            }
        } //for
        if ( ii === vL ) {          //didn't find the name
            return this;
        }
        subloc = ii;
        /*
            We'll go through the term array, getting the power to use,
            and shrinking the term's subarray as we go, as we multiply
            the constant by aFloat**power...
        */
        ii = 0;
        while ( ii < tArr.length ) {
            thePower = tArr[ii][subloc];
            tArr[ii].splice(subloc,1);          //remove this location in the term
            currCon = tArr[ii]._con * Math.pow( aFloat, thePower );
            if ( currCon === 0 ) {
                tArr.splice( ii, 1 );           //remove the term itself
                cleanIt = true;
                continue;
            }
            tArr[ii]._con = currCon;
            ii++;
        } //while
        /*
            Now, let's remove the variable's name from the var-array...
        */
        vArr.splice( subloc, 1 );

        if ( !_tCombine(this) ) {       //if we lost a term type
            cleanIt = true;             // then perhaps we lost (another) variable...
        }

        if ( cleanIt ) {                //Were terms dropped?
            _pClean( this );            //If so, check for dead variables
        }

        return this;
    } //poReduce

    function poPartial( aVar ) {
    /*
        Takes the partial of 'this' relative to 'aVar'. Returns the partial poly.
    */
        var ii, currPower, currTerm, currCon, vLoc,
            tArr = this.termArr,
            inL = tArr.length,
            partPoly = poMake(),
            partTerms = [],
            vArr = this.varArr,
            vL = vArr.length;

        //Find where the variable power is in a term:
        for ( ii = 0; ii < vL; ii++ ) {
            if ( aVar.localeCompare(vArr[ii]) === 0 ) {
                vLoc = ii;
                break;
            }
        } //for

        for ( ii = 0; ii < inL; ii++ ) {
            currTerm = tArr[ii].concat();
            if ( (currPower = currTerm[vLoc]) === 0 ) { //this term will drop out
                continue;
            }
            currTerm[vLoc] -= 1;                        //reduce by one
            currTerm._con = currPower * tArr[ii]._con;  //the new constant factor
            partTerms.push( currTerm );                 //add in the new term
        } //for
        /*
            All terms that did not contain 'aVar' have dropped out, and no terms
            need be combined. However, the variable-array must needs be adjusted.
        */
        partPoly.termArr = partTerms;
        partPoly.varArr = vArr.concat();
        _pClean( partPoly );
        return partPoly;
    } //poPartial

    function poVar() {
    /*
        Returns an array of the names of the polynomial's variables. If this is only a constant,
        returns an empty array.
    */
        return this.varArr.concat();
    } //poVar

    function poVal( valArr ) {
    /*
        Accepts an array list of {_nm, _num} objects giving the variable names and the numbers to use.
        If the variable name is in use in 'this', substitutes the number for the variable. Returns the
        value of this after all the numbers have been substituted. 'this' is unchanged.

        If the polynomial is empty, returns 0. If it has only a constant term,
        returns that constant.

        Throws an error if the list is missing some names that are in use.
    */
        var ii, jj, currTerm, currProd, currPower, currVName,
            theTotal = 0,
            valueArr = [],
            argL = valArr.length, 
            vArr = this.varArr,   
            varL = vArr.length,
            tArr = this.termArr,
            termL = tArr.length;

        if ( termL === 0 ) {
            return 0;
        }

        if ( varL > argL ) {
            throw ( new Error("poVal: Too few arguments") );
        }
        
        if ( varL === 0 ) {
            return tArr[0]._con;
        }

        for ( ii = 0; ii < varL; ii++ ) {
            currVName = vArr[ii];
            for ( jj = 0; jj < argL; jj++ ) {
                if ( currVName.localeCompare(valArr[jj]._nm) === 0 ) {
                    valueArr.push( valArr[jj]._num );
                    break;
                }
            } //for
            if ( jj >= argL ) {
                throw ( new Error("poVal: missing a variable!") );
            }
        } //for

        for ( ii = 0; ii < termL; ii++ ) {
            currTerm = tArr[ii];
            currProd = currTerm._con;
            for ( jj = 0; jj < varL; jj++ ) {
                if ( (currPower = currTerm[jj]) === 0) {
                    continue;
                }
                currProd *= Math.pow( valueArr[jj], currPower );
            } //for
            theTotal += currProd;
        } //for

        return theTotal;
    } //poVal

    function poTerms() {
    /*
        Returns the number of terms.
    */
        return this.termArr.length;            
    } //poStartTermWalker

    function poTerm( termNum ) {
    /*
        Returns a copy of the 'termNum'th term, or false if
        there aren't that many.
    */
        var currTerm;
        
        if ( termNum >= this.termArr.length ) {
            return false;
        }

        currTerm = this.termArr[termNum].concat();
        currTerm._con = this.termArr[termNum]._con;
        return currTerm;
    } //poNextTerm

    function poZero() {
    //Returns true if 'this' is null.
        if ( this.termArr.length === 0 ) {
            return true;
        }
    } //poZero

    function poShow() {
    //return a string representation of this polynomial.
        var ii, jj, aPlus,
            numTerms = this.termArr.length,
            termWidth = this.varArr.length,
            outStr = '';
        if ( this.termArr.length === 0 ) {
            return "0";
        }
        for ( ii = 0; ii < numTerms; ii++ ) {
            aPlus = (ii === 0) ? "" : " + ";
            outStr += aPlus + "(" + this.termArr[ii]._con.toString() + ")";
            for ( jj = 0; jj < termWidth; jj++ ) {
                if ( this.termArr[ii][jj] === 0 ) {
                    continue;
                }
                outStr += "(" + this.varArr[jj] + "**" + this.termArr[ii][jj].toString() + ")";
            } //for
        } //for
        return outStr;
    } //poShow

    POLY.poMake = poMake;
    POLY.poCCGPL = "Copyright J.R. McCall 2012. Use and modify under the terms of the GNU GPL version 3 or later.";
    _thePro_._type = "j45poly";
    _thePro_.clone = poClone;
    _thePro_.partial = poPartial;
    _thePro_.vars = poVar;
    _thePro_.terms = poTerms;
    _thePro_.term = poTerm;
    _thePro_.plus = poPlus;
    _thePro_.times = poTimes;
    _thePro_.scale = poScale;
    _thePro_.reduce = poReduce;
    _thePro_.expand = poPuff;
    _thePro_.empty = poZero;
    _thePro_.toString = poShow;
    _thePro_.toValue = poVal;
} () ); ////////////////////////////////////POLYNOMIAL////////////////////////


(function() {
    'use strict';
    var POLY = j45.POLY;
/* **********************************************************************************************
                                               VECTOR

    The following routines effect a bare-bones system that allows for the definition and manipulation
    of vectors whose components are floating point numbers or 'polynomials' -- where the polynomial
    component is the datatype effected by 'POLY.poMake'.

********************************************************************************************** */
    var _thePro_ = {};

/*************************************************************************************
*************************************************************************************/
    function veMake( theEltArr ) {
    /*
        This is the constructor, but DOES NOT TAKE 'new': it creates a vector whose components
        correspond to the elements of 'theEltArr', an array. An input element (and so any vector component)
        can be either a number or a polynomial. An empty array creates a zero vector, which is,
        in ordinary terms, an empty vector. A missing input parameter also creates a zero vector.

        An empty polynomial becomes a 0 component of the vector.
    */
        var _thus_, ii, currComp, argL;

        _thus_ = Object.create( _thePro_ );

        _thus_.compArr = [];
        if ( !theEltArr ) {
            return _thus_;
        }
        argL = theEltArr.length;
        if ( argL === 0 ) {
            return _thus_;
        }

        for ( ii = 0; ii < argL; ii++ ) {
            currComp = theEltArr[ii];
            if ( typeof currComp === 'number' ) {
                if ( !isFinite(currComp) ) {
                    throw (new Error('aVector: Input not a proper number'));
                } else {
                    _thus_.compArr.push( currComp );
                    continue;
                }
            }          
            if ( currComp._type != "j45poly" ) {
                throw (new Error('aVector: Non-polynomial input object'));
            } else {
                currComp = (currComp.empty()) ? 0 : currComp;
                _thus_.compArr.push( currComp.clone() );
            }
        } //for
        return _thus_;
    } //veMake

    function veClone() {
    /*
        Clones 'this'.
    */
        var ii, currComp,
            thisL = this.compArr.length,
            cloneV = veMake([]),
            newCompArr = cloneV.compArr;

        for ( ii = 0; ii < thisL; ii++ ) {
            if ( typeof (currComp = this.compArr[ii]) === 'number' ) {
                newCompArr.push( currComp );
                continue;
            }
            newCompArr.push( currComp.clone() );
        } //for
        return cloneV;
    } //veClone

    function veKronecker( inV ) {
    /*
        OK, maybe not a real kronecker product, but it returns
        another vector, when 'this' and 'inV' are kronecker'ed together,
        of length the product of the lengths, with the components ordered
        by subscript order, 'this's subscripts larger than 'inV's.

        The components are just all possible products of the input
        vectors' components. Any empty poli component becomes the number 0.
    */
        var ii, jj, currComp, currThis, currIn,
            thisL = this.compArr.length,
            inL = inV.compArr.length,
            outV = veMake([]),
            outVArr = outV.compArr;

        if ( (thisL === 0) || (inL === 0) ) {
            return outV;
        }
        /*
            We want the order to be this0*inV0, this0*inV1, etc.
        */
        for ( ii = 0; ii < thisL; ii++ ) {
            currThis = this.compArr[ii];
            if ( typeof currThis === 'number' ) {
                for ( jj = 0; jj < inL; jj++ ) {
                    currIn = inV.compArr[jj];
                    currComp = (typeof currIn === 'number') ? currThis * currIn : currIn.clone().scale(currThis);
                    if ( typeof currComp === 'object' ) {
                        if ( currComp.empty() ) {
                            outVArr.push(0);
                            continue;
                        }
                    }
                    outVArr.push( currComp );
                } //for
            } else {                                //currThis is a polynomial
                for ( jj = 0; jj < inL; jj++ ) {
                    currIn = inV.compArr[jj];
                    currComp = (typeof currIn === 'number') ? currThis.clone().scale(currIn) : currThis.clone().times(currIn);
                    if ( currComp.empty() ) {
                        outVArr.push(0);
                        continue;
                    }
                    outVArr.push( currComp );
                } //for
            }
        } //for
        return outV;
    } //veKronecker

    function veDotProduct( inV ) {
    /*
        The 'scalar' product of two mixed (numbers and polynomials)
        vectors of the same dimension, 'this' and 'inV'.

        Returns a polynomial. If polynomial terms are preserved over
        multiplication and addition of the input components, fine. If not,
        then a constant-only polynomial is returned, or the empty poli
        if 0 is the result of all this sound and fury.
    */

        var ii, currThis, currIn, currTerm,
            theRePo = POLY.poMake(),
            inArr = inV.compArr,
            thisArr = this.compArr,
            inL = inArr.length,
            thisL = thisArr.length;

        if ( inL != thisL ) {
            throw (new Error('veDotProduct: vectors are not the same size'));
        }

        for ( ii = 0; ii < inL; ii++ ) {
            currThis = this.compArr[ii];
            if ( typeof (currThis = this.compArr[ii]) === 'number' ) {
                if ( typeof (currIn = inV.compArr[ii]) === 'number' ) {
                    currTerm = POLY.poMake( currThis * currIn );
                } else {
                    currTerm = currIn.clone().scale(currThis);
                }
            } else {                //currThis is a poly
                if ( typeof (currIn = inV.compArr[ii]) === 'number' ) {
                    currTerm = currThis.clone().scale( currIn );
                } else {            //currThis, currTerm polys
                    currTerm = currThis.clone().times(currIn);
                }
            } 
            theRePo.plus(currTerm);
        } //for
        return theRePo;
    } //veDotProduct

    function veShow() {
    //return a string representing this vector
        var ii, theComp, lBracket, rBracket,
            aPlus = '',
            numComps = this.compArr.length,
            outStr = '[ ';
        if ( numComps === 0 ) {
            return "**null**";
        }
        for ( ii = 0; ii < numComps; ii++ ) {
            theComp = this.compArr[ii];
            lBracket = (typeof theComp === 'number') ? '' : '{ ';
            rBracket = (typeof theComp === 'number') ? '' : ' }';
            outStr += aPlus + lBracket + theComp.toString() + rBracket;
            aPlus = ", ";
        } //for
        outStr += ' ]';
        return outStr;
    } //veShow 
////////////////
    POLY.veMake = veMake;
    _thePro_._type = "j45vect";
    _thePro_.clone = veClone;
    _thePro_.kron = veKronecker;
    _thePro_.dot = veDotProduct;
    _thePro_.toString = veShow;
} () ); ////////////////////////////////////VECTOR////////////////////////


/*
    The routines contained herein are Copyright 2012 J. R. McCall.

    This library is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version: http://www.gnu.org/licenses/gpl.html.

    This group of programs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/
var j45;
j45 || (j45 = {});
j45.POLY || (j45.POLY = {});

(function() {
    'use strict';
    var POLY = j45.POLY,
        _poMake = POLY.poMake;
/* **********************************************************************************************
                                               EQUATION

    Routines to use numerical methods to solve n polynomial equations in n unknowns. It uses
    the polynomial and vector routines in POLY.

********************************************************************************************** */

    function eqLinear( inPolyArr ) {
    /*
        Solve n linear equations in n unknowns. The equations must be 'monolinear'
        (that is, be only a sum of constant-times-variable, plus (perhaps) a constant term.

        The equations are represented by an array of polynomials. By convention, the 
        equation is the polynomial set equal to 0.

        Returns an array of objects: [ {_nm, _num} ], where '_nm' is the variable name,
        '_num' is its solved value. The order is by variable name.

        A given polynomial need not have all n variables. The total of n polynomials should
        neither over-determine nor under-determine the n-fold solution.
    */
        ////////////////////////////////////////////////////////////////////
        function __recurser( pArr ) {
        /*
            This is the main routine. It is set up by copying the input,
            so that it is free to modify the polynomials. It calls itself,
            each time with a smaller array of polynomials.
        */
            var ii, currP, currVar, currVal, currTerm, tL,
                gotCurrent = false,
                solArr = [];

            /*
                Let's find a polynomial with a first term containing
                a variable, and use the first variable we encounter in
                the first polynomial that has one...
            */
            while ( pArr.length > 0 ) {
                currP = pArr.shift();
                if ( currP.empty() ) {
                    continue;
                }
                currTerm = currP.term(0);
                tL = currTerm.length;
                for ( ii = 0; ii < tL; ii++ ) {
                    if ( currTerm[ii] > 0 ) {
                        gotCurrent = true;
                        break;
                    }
                } //for
                if ( gotCurrent ) {
                    break;
                }
            } //while
            if ( gotCurrent ) {
                currVar = currP.vars()[ii];
            } else {
                return [];                  //no useable polynomial in the input array
            }
            /*
                At this point, we have a polynomial, a first term, and a variable name. We're going to solve
                for the variable. We assume only one variable is in this term. We get a substitution poly,
                and hold it for when all the other values are returned, and we can evaluate it.
            */
            currP.reduce(currVar,0).scale( (-1)/currTerm._con ); //'solve' for currVar in this poly
            //substitute the solution for currVar into the other polys
            for ( ii = 0; ii < pArr.length; ii++ ) {
                pArr[ii].expand( currVar, currP );
            } //for
            solArr = __recurser( pArr );                //finish the rest of the array
            //__recurser returns an object filled in with the values currP needs
            currVal = currP.toValue( solArr );          //Let's add our calculated value
            solArr.push( {_nm:currVar, _num:currVal} ); // to the object
            return solArr;                              //  and return up a level
        } //__recurser
        ////////////////////////////////////////////////////////////////////
        var ii,
            inL = inPolyArr.length,
            playArr = [];

        for ( ii = 0; ii < inL; ii++ ) {
            playArr.push( inPolyArr[ii].clone() );
        } //for
        /*
            Now, with the modifiable polynomials, start up the recursive solver,
            and return, sorted, its solution:
        */
        return __recurser( playArr ).sort( function( aObj, bObj ) {
                                                if ( aObj._nm === bObj._nm ) {
                                                    return 0;
                                                }
                                                return (aObj._nm < bObj._nm) ? -1 : 1;
                                            } );
     } //eqLinear

    function eqBigNewton( thePolyArr, theStartArr, theDelta, maxTries ) {
    /*
        Solve a system of m arbitrary-(non-negative)-degree polynomials with m unknowns.

        'thePolyArr' is an array of polynomials: each, as an equation, is assumed
        to be set equal to 0.

        'theStartArr' is an array of objects, one for each unknown: {_nm, _num}, with
        Ob._nm being the unknown (i.e. variable) name, Ob._num being the suggested start
        value at which to begin the search for a root.

        'theDelta' is required, and gives the band within which all deltas must fall (i.e.
        the absolute value of each delta must be <= 'theDelta') in order to be done.

        'maxTries' gives the maximum iterations, in the Newton-method sense. It is required,
        and can be set to as high as 50. If it is exceeded, the function returns 'false'.
      
        The root will normally be approximate, via the extension of Newton's method to the
        many-variable case.

        This function returns a 'solution array': it's format is the same as that of 'theStartArr'.
        In addition, the array as a whole has a '_tries' property, which will be set greater
        than 'maxTries' if it had to bail out. Otherwise, gives the number of iterations (which
        could actually be equal to 'maxTries').
    */
        var _partArr = [],                   //an array of arrays of partials
            _theSize = thePolyArr.length;    //the length of pretty much every array

        ////////////////////////////////////////////////////////////////////////
        function __theMove( xArr ) {
        /*
            This is the solution-iteration move. Each variable's current approximation
            is re-done. The new deltas are computed by, first, computing current values
            for each of the possible partials and for the polynomials themselves, then
            solving m linear equations in m unknowns (THESE unknowns are the new deltas.)

            The partial polynomials, as well as the original problem polynomials, have been
            placed in arrays accessible to this function.

            The input array is the same {_nm, _num} format as the original start-value array.
        */
            var ii, jj, partArr, currDeltaPoly,
                linArr = [];

            /*
                Let's build the m linear equations to calculate the new deltas. Each delta's
                name is simply its variable's name in the original and partial polys. This allows
                easy evaluations of each partial without reformatting values.
            */
            for ( ii = 0; ii < _theSize; ii++ ) {
                partArr = _partArr[ii];             //get the partials for the ii'th function
                currDeltaPoly = _poMake();
                for ( jj = 0; jj < _theSize; jj++ ) {
                    currDeltaPoly.plus( _poMake(partArr[jj].toValue(xArr), theStartArr[jj]._nm, 1) ); //whew!
                }
                /*
                    We have the variables in the poly: now let's calculate the current value of
                    the original ii'th function, and make it the constant term.
                */
                currDeltaPoly.plus( _poMake(thePolyArr[ii].toValue(xArr)) ); 
                linArr.push( currDeltaPoly );       //insert the ii'th linear equation
            } //for
            /*
                At this point we have an array of m linear equations in the deltas. Let's solve
                them to get the new value-change for each unknown. If this fails, this routine
                will pass on 'false', otherwise the object-array of new delta values.
            */
            return eqLinear( linArr );
        } //__theMove
        ////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////
        var ii, jj, ourMax, onePartArr, currPoly, currDel, currVar, allDone, delArr, tryArr;

        /*
            Initially, set up values, including the partials arrays...
        */

        ourMax = (maxTries > 50) ? 50 : maxTries;
        /*
            Now set up the array of partials arrays. The order of variables is that in 'theStartArr'.
        */
        for ( ii = 0; ii < _theSize; ii++ ) {
            currPoly = thePolyArr[ii];
            onePartArr = [];
            for ( jj = 0; jj < _theSize; jj++ ) {
                currVar = theStartArr[jj]._nm;
                onePartArr.push( currPoly.partial(currVar) ); 
            } //forfor
            _partArr.push( onePartArr );        //the array of partials for the ii'th input poly
        } //for
        /*
            Now try to get some answers...
        */
        tryArr = theStartArr;                   //start with the starts       
        for ( ii = 0; ii < ourMax; ii++ ) {
            delArr = __theMove( tryArr );
            if ( delArr === false ) {
                throw new Error("eqBig: Failure in iteration step");
            }
            allDone = true;
            for ( jj = 0; jj < _theSize; jj++ ) {
                tryArr[jj]._num += ( currDel = delArr[jj]._num );
                if ( Math.abs( currDel ) > theDelta ) {
                    allDone = false;
                }
            } //forfor
            if ( allDone === true ) {
                tryArr._tries = ii;
                return tryArr;
            }
        } //for
        tryArr._tries = maxTries + 1;
        return tryArr;                         //if we got here, we had too many iterations
    } //eqBigNewton
    ///////////////////////////////////////////////////////////////////////
    POLY.eqBig = eqBigNewton;
    POLY.eqLinear = eqLinear;

} () ); ////////////////////////////////////EQUATION////////////////////////

