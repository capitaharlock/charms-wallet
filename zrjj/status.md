Ah, I see the issue! This is a common error in Bitcoin transactions. The error message bad-txns-in-belowout, value in (0.00001) < value out (0.00001092) means:
The transaction is trying to spend more bitcoin than what's available in the input:

Input amount: 0.00001 BTC (1000 satoshis)
Output amount: 0.00001092 BTC (1092 satoshis)
Difference: 92 satoshis short

Breaking down your outputs:

First output: 0x0222 = 546 satoshis
Second output: 0x0222 = 546 satoshis
Total: 1092 satoshis

To fix this, you need to either:

Use an input with more funds
Reduce the output amounts to be less than or equal to your input amount
Make sure you're accounting for the transaction fee

Would you like me to help you adjust the transaction amounts to make it valid?