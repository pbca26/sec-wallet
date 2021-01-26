mkdir bin
mkdir bin/win64
mkdir bin/linux64
mkdir bin/osx
cd bin/win64
wget https://github.com/KomodoPlatform/komodo/releases/download/cd_release_0d65a73_research/komodo_0d65a73_research_win.zip
tar -xvzf komodo_0d65a73_research_win.zip
rm komodo_0d65a73_research_win.zip
cd ../linux64
wget https://github.com/KomodoPlatform/komodo/releases/download/cd_release_0d65a73_research/komodo_0d65a73_research_linux.zip
tar -xvzf komodo_0d65a73_research_linux.zip
rm komodo_0d65a73_research_linux.zip
cd ../osx
wget https://github.com/KomodoPlatform/komodo/releases/download/cd_release_0d65a73_research/komodo_0d65a73_research_osx.zip
tar -xvzf komodo_0d65a73_research_osx.zip
rm komodo_0d65a73_research_osx.zip