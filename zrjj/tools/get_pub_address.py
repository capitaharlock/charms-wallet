import os
# Set CRYPTO_LIB to the full path of your libcrypto DLL.
os.environ['CRYPTO_LIB'] = r"C:\OpenSSL-Win64\bin\libcrypto-1_1-x64.dll"

import bip32utils
from bitcoin import SelectParams
from bitcoin.wallet import CBitcoinSecret, P2WPKHBitcoinAddress

# Select testnet parameters
SelectParams('testnet')

# Derive child key from your extended private key
tprv = "tprv8ZgxMBicQKsPdQmuRRZLwDCp2m4357q4ReZRbaNDjBXVqgcYgaUNexdG2Em1bzRW6KC819xvFMevktXg2RNxM3NMe7uQ8jp5L2cMYFF68jA"
master = bip32utils.BIP32Key.fromExtendedKey(tprv)
child0 = master.ChildKey(0)
child_wif = child0.WalletImportFormat()
print("Child WIF:", child_wif)

# Convert the child key to a native segwit (P2WPKH) address
secret = CBitcoinSecret(child_wif)
native_segwit_addr = P2WPKHBitcoinAddress.from_pubkey(secret.pub)
print("Native Segwit Address:", native_segwit_addr)
