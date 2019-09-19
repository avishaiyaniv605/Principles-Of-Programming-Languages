% Scheme sublanguage simplified grammar encoded in Prolog.
% Each syntactic category is implemented as a predicate that holds
% when a list of strings belongs to the category.

% sc/1, a.k.a "S Category" is the top category.
% Precondition: X is bound.
% Examples:
% ?- sc([a]).                % a
% true
% ?- sc([1]).                % 1
% true
% ?- sc(['(', '+', 1, 2, ')']).                % (+ 1 2)
% true
% ?- sc(['(', '+', 1, 2, '(', '+', 1, 2, ')', ')']).                % (+ 1 2 (+ 1 2))
% true
% An example for the exercise of lambda implementation:
% ?- sc(['(','+' , 1, '(', '+',  '(',  lambda, '(', ')', 3, ')', ')' , ')']).                % (+ 1 (+ (lambda () 3)))
% true

sc(X) :- atomc(X).
sc(X) :- compoundc(X).

atomc(X) :- numberc(X).
atomc(X) :- booleanc(X).
atomc(X) :- stringc(X).

compoundc(X) :- regularformc(X).
compoundc(X) :- specialformc(X).

% The append must appear first to avoid free recursion.
% This is why there must be a precondition to sc/1.
regularformc(Z) :-
append([['('], X, Y, [')']], Z),
stringc(X),
manysc(Y).

% Signature: specialformc(expression)/1
% Purpose: handling lambda expression when parsing a program
% Example:
% ?- sc(['(','+' , 1, '(', '+',  '(',  lambda, '(', ')', 3, ')', ')' , ')']).
% true
specialformc(Z) :-
append([['('], ['('], ['lambda'], ['('], X, [')'], Y, [')'], W, [')']], Z),
manystrc(X),
manysc(Y),
manysc(W),
W \= [].

specialformc(Z) :-
append([['('], ['lambda'], ['('], X, [')'], Y, [')']], Z),
manystrc(X),
manysc(Y).


% This predicate parses zero or more concatenated string elements
manystrc([]).
manystrc(Z) :-
append(X, Y, Z),
stringc(X),
manystrc(Y).


% This predicate parses zero or more concatenated "sc" elements
manysc([]).
manysc(Z) :-
append(X, Y, Z),
sc(X),
manysc(Y).

numberc([X]) :-
number(X).

booleanc(['#t']).
booleanc(['#f']).

stringc([X]) :-
atom(X),
X \= '(',    % Succeeds when X is not unifiable with '('
X \= ')'.

