# capital-gains-calculator
appends profit/loss to a list of purchase/sell transactions (for fifo capital gains)

## install
```
git clone git@github.com:colealbon/capital-gains-calculator.git
cp transactions.txt.example transactions.txt
```   
modify transactions.txt with your own transactions   
 
## usage
```
node index.js | jq .
```
or just
```
node index.js
```

## hacking
it might be possible to remove the reverse() on line 12 for lifo (we didn't try)
