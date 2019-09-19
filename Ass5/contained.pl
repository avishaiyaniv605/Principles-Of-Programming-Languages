% Signature: contained(List1, List2)/2
% Purpose: All elements in List1 appear in List2 in some (possibly different) order.
% Precondition: List2 is fully instantiated
% Example:
% ?- contained(X, [1, 2]).
% X = [1, 2];
% X = [2, 1];
% X = [1];
% X = [2];
% X = [];
contained(X,Y):- is_list(Y), check-contained(X,Y).
contained(X,Y):- is_list(Y), X=[].

% Signature: check-contained(List1, List2)/2
% Purpose: All elements in List1 appear in List2 in some (possibly different) order.
% Precondition: none
% Example:
% ?- check-contained(X, [1, 2]).
% X = [1, 2];
% X = [2, 1];
% X = [1];
% X = [2];
check-contained(X,Y) :- member(T,Y),select(T,Y,Y1),check-contained(T2,Y1),append([T],T2,X).
check-contained(X,Y) :- member(T,Y),append([T],[],X).


