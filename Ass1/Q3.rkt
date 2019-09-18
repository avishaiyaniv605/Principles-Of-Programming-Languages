#lang racket
(provide (all-defined-out))

;; Signature: ngrams(list-of-symbols, n)
;; Purpose: Return a list of consecutive n symbols
;; Type: [List(Symbol) * Number -> List(List(Symbol))]
;; Precondition: n <= length(list-of-symbols)
;; Tests: (ngrams '(the cat in the hat) 3) => '((the cat in) (cat in the) (in the hat))
;;        (ngrams '(the cat in the hat) 2) => '((the cat) (cat in) (in the) (the hat))
(define ngrams
  (lambda (los n)
    (if (< n 0)
      '()
        (if (equal? n (length los))         ; n equals to list length
        (list los)
        (if (empty? los)
          '()
          (cons (get-first-n los n) (ngrams (cdr los) n) ))))))   ;recursive call to calculate the next sub lists


;; Signature: get-first-n(list-of-symbols, n)
;; Purpose: Return an n-sized sub list of los
;; Type: [List(Symbol) * Number -> List(Symbol)]
;; Precondition: n <= length(list-of-symbols)
;; Tests: (get-first-n '(the cat in the hat) 3) => '(the cat in)
(define get-first-n
  (lambda (los n)
    (if (empty? los)
      '()
      (if (equal? n 0)
        '()
      (cons (car los) (get-first-n (cdr los) (- n 1)))))))

;; Signature: length(list)
;; Purpose: Return the size of list
;; Type: [List(Symbol) -> Number]
;; Precondition: true
;; Tests: (length '(the cat in the hat) ) => 5
(define length
  (lambda (lis)
    (if (empty? lis)
      0
      (+ 1 (length (cdr lis)) ))))


;; Signature: ngrams-with-padding(list-of-symbols, n)
;; Purpose: Return a list of consecutive n symbols, padding if necessary
;; Type: [List(Symbol) * Number -> List(List(Symbol))]
;; Precondition: n <= length(list-of-symbols)
;; Tests: (ngrams-with-padding '(the cat in the hat) 3) => '((the cat in) (cat in the) (in the hat) (the hat *) (hat * *))
;;        (ngrams-with-padding '(the cat in the hat) 2) => '((the cat) (cat in) (in the) (the hat) (hat *))
(define ngrams-with-padding
  (lambda (los n)
    (if (< n 0)
      '()
        (if (empty? los)
            '()
            (if (> n (length los))
            (cons (aster-with-list los n) (ngrams-with-padding (cdr los) n)) 
            (cons (get-first-n los n) (ngrams-with-padding (cdr los) n) ))))))


;; Signature: append(list1, list2)
;; Purpose: Return a list combined of list1 at first and then list2
;; Type: [List(Symbol) * List(Symbol) -> List(Symbol)]
;; Precondition: true
;; Tests: (append '(the cat) '(in the hat)) => '(the cat in the hat)

(define append 
    (lambda (list1 list2)
        (if (null? list2) 
            '()
            (if (null?  list1)
                (cons (car list2) (append list1 (cdr list2)))
                (cons (car list1) (append (cdr list1)  list2))))))


;; Signature: aster-with-list(list-of-symbols, n)
;; Purpose: Return a list combined of los at first and (n - lenth f los) asteriks
;; Type: [List(Symbol) * Number -> List(Symbol)]
;; Precondition: n > length(list-of-symbols)
;; Tests: (aster-with-list '(the cat) 3) => '(the cat *)
(define aster-with-list
  (lambda (los n)
    (if (equal? 0 n)
        '()
        (if (empty? los)
            '()
            (append los (aster(- n (length los))))))))



;; Signature: aster(n)
;; Purpose: Return a list of n asteriks
;; Type: [Number -> List(Symbol)]
;; Precondition: n >= 0
;; Tests: (aster 3) => '(* * *)
(define aster
  (lambda ( n)
    (if (equal? 0 n)
        '()
        (cons '* (aster (- n 1))))))