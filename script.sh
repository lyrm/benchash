dir='digestif_benchmark'
exe='src/bench.exe'
json_file='output.json'
output='result.html'

dune build

./_build/default/$exe --hash sha1 --hash sha512 --measure clock > $json_file


bechamel-html < $json_file > $output
