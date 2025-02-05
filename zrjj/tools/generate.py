from bitcoinlib.wallets import Wallet

# Create a wallet from an extended private key (tprv)
tprv = "tprv8ZgxMBicQKsPdQmuRRZLwDCp2m4357q4ReZRbaNDjBXVqgcYgaUNexdG2Em1bzRW6KC819xvFMevktXg2RNxM3NMe7uQ8jp5L2cMYFF68jA"
wallet = Wallet.create("SegwitWallet", keys=tprv, network='testnet', witness_type='segwit')

# Get the first key from the wallet
key = wallet.get_key()
print("Child WIF:", key.wif)
print("Native Segwit Address:", key.address)