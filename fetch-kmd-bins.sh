mkdir bin
mkdir bin/win64
mkdir bin/linux64
mkdir bin/osx
cd bin/win64
wget https://github.com/pbca26/komodod/releases/download/cd_release_8688665_dev/komodo_8688665_dev_win.zip
tar -xvzf komodo_8688665_dev_win.zip
rm komodo_8688665_dev_win.zip
cd ../linux64
wget https://github.com/pbca26/komodod/releases/download/cd_release_8688665_dev/komodo_8688665_dev_linux.zip
tar -xvzf komodo_8688665_dev_linux.zip
rm komodo_8688665_dev_linux.zip
cd ../osx
wget https://github.com/pbca26/komodod/releases/download/cd_release_8688665_dev/komodo_8688665_dev_osx.zip
tar -xvzf komodo_8688665_dev_osx.zip
rm komodo_8688665_dev_osx.zip