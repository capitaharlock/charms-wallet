# First, remove the submodule
rm -rf btc-wallet-api/
rm -rf .git/modules/btc-wallet-api

# If there's a .gitmodules file, remove any btc-wallet-api references or delete it
rm -f .gitmodules

# Now add everything and commit
git add .
git commit -m "Project setup with API and frontend components"
git push -u origin main