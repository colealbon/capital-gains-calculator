const csv = require('csv-parser')
const fs = require('fs')
let results = []
let transactions = {}
let runningInventoryAmount = 0
let runningSalesAmount = 0

fs.createReadStream('transactions.txt')
.pipe(csv())
.on('data', (data) => results.push(data))
.on('end', () => {
  Object.keys(results).reverse().map((row) => {
    const tagless = {}
    Object.keys(results[row]).map((label) => {
      if (label === 'amount_btc') {
        tagless.amount_satoshi = parseInt((results[row][label] * 100000000) + .5)
      }
      else if (label === 'fee') {
        tagless.fee_satoshi = parseInt((results[row][label] * 100000000) + .5)
      }
      else if (label === 'pennies_per_btc') {
        tagless.pennies_per_btc = parseInt(results[row][label])
      }
      else if (label === 'currency') {
        tagless.currency = results[row][label]
      }
      else {
        tagless[label] = results[row][label]
      }
    })
    if (tagless.amount_satoshi > 0) {
      transactions[`${tagless.date}${tagless.txid}`] = tagless
      transactions[`${tagless.date}${tagless.txid}`].type = 'purchase'
      transactions[`${tagless.date}${tagless.txid}`].inventoryBefore = runningInventoryAmount
      transactions[`${tagless.date}${tagless.txid}`].inventoryAfter = runningInventoryAmount + tagless.amount_satoshi
      runningInventoryAmount = runningInventoryAmount + tagless.amount_satoshi
    } else {
      transactions[`${tagless.date}${tagless.txid}`] = tagless
      transactions[`${tagless.date}${tagless.txid}`].type = 'sale'
      transactions[`${tagless.date}${tagless.txid}`].salesBefore = runningSalesAmount
      transactions[`${tagless.date}${tagless.txid}`].salesAfter = runningSalesAmount - tagless.amount_satoshi
      runningSalesAmount = runningSalesAmount - tagless.amount_satoshi
    }
  })
  let theReport = []
  let salesWithInventory = Object.keys(transactions)
  .filter((salesIndex) => transactions[salesIndex].type === 'sale')
  .map((salesIndex) => {
    let inventory = Object.keys(transactions)
    .filter((inventoryIndex) => inventoryIndex < salesIndex)
    .filter((inventoryIndex) => transactions[inventoryIndex].type === 'purchase')
    .map((inventoryIndex) => {
      return Object.assign(
        {
          sale: transactions[salesIndex],
          purchase: transactions[inventoryIndex]
        }
      )
    })
    return Object.assign(inventory)
  })
  .map((saleTransaction) => {
    return Object.keys(saleTransaction).map((inventoryItemIndex) => saleTransaction[inventoryItemIndex])
  })
  .reduce((a, b) => a.concat(b)) // flatten arrays
  .filter((transaction) => {
    return transaction.sale.salesBefore <= transaction.purchase.inventoryAfter
  })
  .filter((transaction) => {
    return transaction.sale.salesAfter > transaction.purchase.inventoryBefore
  })
  .sort((a, b) => (a.sale.date > b.sale.date) ? 1 : -1)
  // .filter((item) => item.sale.date > 201700000000)
  // .filter((item) => item.sale.date < 201800000000)
  .map((transaction) => {
    return Object.assign(transaction, {
      calculated: {
        startAmount: transaction.sale.salesBefore >= transaction.purchase.inventoryBefore ? transaction.sale.salesBefore  : transaction.purchase.inventoryBefore, // dead code
        endAmount: transaction.sale.salesAfter <= transaction.purchase.inventoryAfter ? transaction.sale.salesAfter  : transaction.purchase.inventoryAfter, // dead code
        amountSatoshi:
            (transaction.sale.salesAfter <= transaction.purchase.inventoryAfter ? transaction.sale.salesAfter  : transaction.purchase.inventoryAfter ) - (transaction.sale.salesBefore >= transaction.purchase.inventoryBefore ? transaction.sale.salesBefore  : transaction.purchase.inventoryBefore )
      }
    })
  })
  .map((transaction) => {
    theReport.push(
      Object.assign(transaction, {
        purchaseAmountUSD: parseInt(((transaction.calculated.amountSatoshi * transaction.purchase.pennies_per_btc / 10000000000) * 100) + .5) / 100,
        sellAmountUSD: parseInt(((transaction.calculated.amountSatoshi * transaction.sale.pennies_per_btc / 10000000000) * 100) + .5) / 100,
        profitUSD: parseInt(((transaction.calculated.amountSatoshi  * (transaction.sale.pennies_per_btc - transaction.purchase.pennies_per_btc) / 10000000000) * 100) + .5) / 100,
        saleYear: parseInt(transaction.sale.date / 100000000),
        saleMonth: parseInt(transaction.sale.date / 1000000),
        saleDay: parseInt(transaction.sale.date / 10000)
      })
    )
  })
  console.log(JSON.stringify(theReport))
  // console.log(parseInt(((theReport.map((item) => 0.0 + item.profitUSD).reduce((a, b) => 0.0 + a + b)* 100) + .5)) / 100)
})
