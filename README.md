# Purpose
Benchmarks to compare `digestif` and `mirage-crypto` hash functions using `bechamel`.

# How to launch
## Script
`./script` launches some benchmarks for examples. You can either changes the parameters of the benchmarks directly in the script file or launch it manually. 

## `bench.exe` parameters
### Command line 
`bench [OPTION] ...`

### Available options
 
- `--hash=HASH` or `-hash HASH` with `HASH` in `md5`, `sha1`, `sha224`, `sha256`, `sha384` or `sha512`. Default value is `sha512`
- `--measure=MEASURE` or `-measure MEASURE` with `MEASURE` in `clock`, `minor`, `major`. Default value is `clock`. 

### About measures
`clock` launches measurements for the `monotonic clock` (i.e. runtime). `minor` and `major` are for measuments of allocated memory in minor and major heap respectively.
