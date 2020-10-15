# Purpose
Benchmarks to compare `digestif` and `mirage-crypto` hash functions using `bechamel`.

# How to launch
## Script
`./script` launches some benchmarks for example. You can either change the parameters of the benchmarks directly in the script file or launch it manually.

## `bench.exe` parameters
### Command line
`bench [OPTION] ...`

### Available options

- `--hash=HASH` or `--hash HASH` with `HASH` in `md5`, `sha1`,
  `sha224`, `sha256`, `sha384` or `sha512`. Default value is
  `sha512`. This option defines which hash functions are
  benchmarked. It can be used multiple times to benchmark several
  hashes functions.

- `--measure=MEASURE` or `--measure MEASURE` with `MEASURE` in
  `clock`, `minor`, `major`. Default value is `clock`. This option
  defines what measurements are taken. `clock` will result in
  measurements for the `monotonic clock` (i.e. runtime). `minor` and
  `major` are for measurements of allocated memory in minor and major
  heap respectively. This option can be used only once by command
  line.

- `--all` make that benchmarks for all available hashes are
  launched. This option overwrites the `hash` option.
