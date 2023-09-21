
In file
>node_modules/puppeteer/lib/cjs/puppeteer/node/BrowserFetcher.js

change 
executablePath="./src/win64-982053/chrome-win/chrome.exe"

'''
   _getFolderPath(revision) {
        return "./src/win64-982053/chrome-win";
      }
'''


1-esbuild index.js --bundle --platform=node --outfile=index_out.js --minify --legal-comments=none
2-pkg.cmd -t node18 --debug index_out.js -o wweb.exe --no-bytecode --public
compile: browserify --node --ignore-missing index.js -o .\dist\bundle.js



