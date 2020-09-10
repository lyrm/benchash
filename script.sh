dir='digestif_benchmark'
exe='src/bench.exe'
json_file='html/output.json'
js_file='html/with_data.js'

dune build

./_build/default/$exe --hash sha1 --hash sha512 --measure clock > $json_file


dune exec bechamel-html/bechamel_html.exe < $json_file > $js_file
