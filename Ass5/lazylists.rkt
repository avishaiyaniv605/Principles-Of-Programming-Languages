#lang racket
;; The empty lazy list value (a singleton datatype)
(define empty-lzl '())

;; Purpose: Value constructor for non-empty lazy-list values
;; Type: [T * [Empty -> LZL(T)] -> LZT(T)]
(define cons-lzl cons)

;; Accessors
;; Type: [LZL(T) -> T]
;; Precondition: Input is non-empty
(define head car)

;; Type: [LZL(T) -> LZL(T)]
;; Precondition: Input is non-empty
;; Note that this *executes* the continuation 
(define tail
  (lambda (lzl)
    ((cdr lzl))))
;; Type predicate
(define empty-lzl? empty?)

;; Signature: lz-lst-append(lz1, lz2)
;; Type: [Lzl(T) * Lzl(T) -> Lzl(T)]
(define lzl-append
  (lambda (lz1 lz2)
    (if (empty-lzl? lz1)
        lz2
        (cons-lzl (head lz1)
                  (lambda () (lzl-append (tail lz1) lz2))))))

(define integers-from
  (lambda (n)
    (cons-lzl n (lambda () (integers-from (+ n 1))))))

(define fibs
  (cons-lzl 0
            (lambda () (cons-lzl 1 
                                 (lambda () 
                                   (lzl-add (tail fibs) fibs))))))

;; Signature: lz-add(lz1,lz2)
;; Type: [LzL(Number) * LzL(Number) -> LzL(number)]
(define lzl-add
  (lambda (lz1 lz2)
    (cond ((empty-lzl? lz1) lz2)
          ((empty-lzl? lz2) lz1)
          (else (cons-lzl (+ (head lz1) (head lz2))
                          (lambda () (lzl-add (tail lz1) (tail lz2))))))))

;; Signature: take(lz-lst,n)
;; Type: [LzL*Number -> List]
;; If n > length(lz-lst) then the result is lz-lst as a List
(define take
  (lambda (lz-lst n)
    (if (or (= n 0) (empty-lzl? lz-lst))
      empty-lzl
      (cons (head lz-lst)
            (take (tail lz-lst) (- n 1))))))

; Signature: nth(lz-lst,n)
;; Type: [LzL*Number -> T]
;; Pre-condition: n < length(lz-lst)
(define nth
  (lambda (lz-lst n)
    (if (= n 0)
        (head lz-lst)
        (nth (tail lz-lst) (sub1 n)))))

;; Signature: interleave(lz1, lz2)
;; Type: [Lzl(T) *Lzl(T) -> Lzl(T)]
(define interleave
  (lambda (lz1 lz2)
    (if (empty-lzl? lz1)
        lz2
        (cons-lzl (head lz1)
                  (lambda () (interleave lz2 (tail lz1)))))))

; Some lazy lists
(define ones (cons-lzl 1 (lambda() ones)))
(define twos (cons-lzl 2 (lambda() twos)))
(define threes (cons-lzl 3 (lambda() threes)))
(define ints (integers-from 0))

(define positives-til0
  (lambda (x)
    (if (= x 0) empty-lzl
    (cons-lzl x (lambda () (positives-til0 (- x 1)))))))




;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;              Solution              ;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; Signature: interleave3(lz1, lz2, lz3)
;; Type: Lzl(T)*Lzl(T)*Lzl(T)->Lzl(T)
;; Examples:
;; > (take (interleave3 ones twos threes) 6)
;; '(1 2 3 1 2 3)
;; > (take (interleave3 ones (integers-from 5) threes) 6)
;; '(1 5 3 1 6 3)

(define interleave3
  (lambda (lz1 lz2 lz3)
    (cond ((empty-lzl? lz1) (interleave lz2 lz3))
          ((empty-lzl? lz2) (interleave lz1 lz3))
          ((empty-lzl? lz3) (interleave lz1 lz2))
    (else (cons-lzl (head lz1)
                  (lambda () (interleave3 lz2 lz3 (tail lz1))))))))


;; Signature: biasedInterleave(lz1, lz2)
;; Type: Lzl(T)*Lzl(T)->Lzl(T)
;; > (take (biasedInterleave ones twos) 6) 
;; '(1 1 2 1 1 2)
;; > (take (biasedInterleave ints ones) 6)
;; '(0 1 1 2 3 1)

(define biasedInterleave 
  (lambda (lz1 lz2) (biasedInterleave-h lz1 lz2 1)))

(define biasedInterleave-h 
  (lambda (lz1 lz2 p)
    (if (empty-lzl? lz1)
        lz2
        (cond ((= p 1) (cons-lzl (head lz1)
                       (lambda () (biasedInterleave-h (tail lz1) lz2 2))))
              ((= p 2) (cons-lzl (head lz1)
                       (lambda () (biasedInterleave-h lz2 (tail lz1) 3))))
              ((= p 3) (cons-lzl (head lz1)
                       (lambda () (biasedInterleave-h lz2 (tail lz1) 1))))))))

; (take (biasedInterleave ints (positives-til0 6)) 6)
; (take (biasedInterleave ints ones) 6)


















