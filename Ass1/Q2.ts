import * as R from 'ramda'
import type from 'ramda/es/type';

// Q2.1
export interface NumberTree {
    root: number;
    children: NumberTree[];
}

export const sumTreeIf: ((x: NumberTree, pred: (y: number) => boolean) => number) =
    function (nTree: NumberTree, pred: (input: number) => boolean): number {
        if (pred(nTree.root))
            return nTree.root + nTree.children.reduce((acc, curr) => acc += sumTreeIf(curr, pred), 0);
        return nTree.children.reduce((acc, curr) => acc += sumTreeIf(curr, pred), 0);
    }

// Q2.2
export interface WordTree {
    root: string;
    children: WordTree[];
}

export const sentenceFromTree: (x: WordTree) => string =
    function (wTree: WordTree): string {
        return wTree.root + wTree.children.reduce((finalString, currTree) => finalString += " " + sentenceFromTree(currTree), "");
    };

// Q2.3
export interface Grade {
    course: string;
    grade: number;
}

export interface Student {
    name: string;
    gender: string;
    grades: Grade[];
}

export interface SchoolClass {
    classNumber: number;
    students: Student[];
}

type School = SchoolClass[];

// Q2.3.1
export const hasSomeoneFailedBiology: (x: School) => boolean =
    function (school: School): boolean {
        return !(school.map(x => x.students).reduce((allStudents, currStudent) => allStudents.concat(currStudent), [])
            .map(x => x.grades).reduce((allGrades, currGrade) => allGrades.concat(currGrade), [])
            .filter(x => x.course === 'biology' && x.grade < 56).length === 0);
    };

// Q2.3.2
export const allGirlsPassMath: (school: School) => boolean =
    function (school: School) {
        let girls = school.reduce((acc, curr) => acc.concat(curr.students.filter(x => x.gender === "Female")), []),
            girlsGrades = girls.reduce((acc, curr) => acc.concat(curr.grades.filter(x => x.course === "math")), []);
        return girlsGrades.reduce((acc, curr) => acc && curr.grade >= 56, true);
    };

// Q2.4
export interface YMDDate {
    year: number;
    month: number;
    day: number;
}

export const comesBefore: (date1: YMDDate, date2: YMDDate) => boolean = (date1, date2) => {
    if (date1.year < date2.year) {
        return true;
    }
    if (date1.year === date2.year && date1.month < date2.month) {
        return true;
    }
    if (date1.year === date2.year && date1.month === date2.month && date1.day < date2.day) {
        return true;
    }
    return false;
}

export interface Wallet {
    tag: 'Wallet';
    paymentMethods: PaymentMethod[];
}

export interface ChargeResult {
    tag: 'ChargeResult';
    amountLeft: number;
    wallet: Wallet;
}

export interface Cash {
    tag: 'Cash';
    amount: number;
}

export interface DebitCard {
    tag: 'DebitCard';
    expirationDate: YMDDate;
    amount: number;
}

type PaymentMethod = Cash | DebitCard | Wallet;

const makeChargeResult = (amount: number, wallet: Wallet): ChargeResult =>
    ({ tag: "ChargeResult", amountLeft: amount, wallet: wallet });

const makeDebitCard = (amount: number, expirationDate: YMDDate): DebitCard =>
    ({ tag: "DebitCard", amount: amount, expirationDate: expirationDate });

const makeCash = (amount: number): Cash =>
    ({ tag: "Cash", amount: amount });

const makeWallet = (paymentMethods: PaymentMethod[]): Wallet =>
    ({ tag: "Wallet", paymentMethods: paymentMethods });

const isCash = (x: any): x is Cash => x.tag === "Cash";
const isDebitCard = (x: any): x is DebitCard => x.tag === "DebitCard";
const isWallet = (x: any): x is Wallet => x.tag === "Wallet";

/*
If the method is wallet: go over the methods in the wallet and charge each method separetly.
                         create a new result with the money left so far and all the methods with the updated values.

If the method is cash:  check if the method 'has' enough money and charge accordingly.

If the method is Debit  Card: check if the card is still available and if the method 'has' enough money and charge accordingly.
*/
export const charge: (paymentMethod: PaymentMethod, amount: number, dateOfCharge: YMDDate) => ChargeResult =
    function (paymentMethod: PaymentMethod, amount: number, dateOfCharge: YMDDate): ChargeResult { 
        return isWallet(paymentMethod) ? paymentMethod.paymentMethods.reduce((acc, currPM) => {
            const soFarRes: ChargeResult = charge(currPM, acc.amountLeft, dateOfCharge);
            return makeChargeResult(soFarRes.amountLeft, makeWallet(acc.wallet.paymentMethods.concat(soFarRes.wallet.paymentMethods)))
        }, makeChargeResult(amount, makeWallet([]))) :

            isCash(paymentMethod) ?
                (amount <= paymentMethod.amount ?
                    makeChargeResult(0, makeWallet([makeCash(paymentMethod.amount - amount)])) :
                    (makeChargeResult(amount - paymentMethod.amount, makeWallet([makeCash(0)])))) :

                isDebitCard(paymentMethod) ? 
                    comesBefore(dateOfCharge, paymentMethod.expirationDate) ?
                        (amount <= paymentMethod.amount ?
                            makeChargeResult(0, makeWallet([makeDebitCard(paymentMethod.amount - amount, paymentMethod.expirationDate)])) :
                            makeChargeResult(amount - paymentMethod.amount, makeWallet([makeDebitCard(0, paymentMethod.expirationDate)]))) :
                        makeChargeResult(amount, makeWallet([makeDebitCard(paymentMethod.amount, paymentMethod.expirationDate)])) :
                    null;
    };

