open Cmdliner
open Benchmarks

(* This module define the command line : bench [OPTION] ... *)

let build_parser available =
  let kind = String.concat " or " (List.map (fun (n, _) -> n) available) in
  let kind_of_string str = List.assoc_opt str available in
  Arg.parser_of_kind_of_string ~kind kind_of_string

let build_printer available fmt v =
  let str = fst (List.find (fun (_, v') -> v = v') available) in
  Format.fprintf fmt "%s" str

let build_parser_printer available =
  (build_parser available, build_printer available)

(* Repeatable option --hash=HASH, which defines which hash algorithms are used
   for the benchmark. *)

let hashes =
  let doc = "Compared hash implementations." in
  let hash_conv =
    Arg.conv ~docv:"HASH" (build_parser_printer available_hashes)
  in
  Arg.(
    value & opt_all hash_conv [ `SHA512 ] & info [ "hash" ] ~docv:"HASHES" ~doc)

(* Option --measure=MEASURE, defining what measure is used for the benchmarks. *)

let available_measures : (string * measure) list =
  [
    ("clock", `MONOTONIC_CLOCK);
    ("minor", `MINOR);
    ("major", `MAJOR);
  ]

let measure =
  let doc = "Measure used for benchmarks." in
  let hash_conv =
    Arg.conv ~docv:"MEASURE" (build_parser_printer available_measures)
  in
  Arg.(
    value
    & opt hash_conv `MONOTONIC_CLOCK
    & info [ "m"; "measure" ] ~docv:"MEASURE" ~doc)

let all =
  let doc = "Benchmark all avalaible hash functions. Overwrite --hash." in
  Arg.(
    value
    & flag
    & info ["all"] ~doc)

let bench_t = Term.(const main $ all $ hashes $ measure)

let info =
  let doc =
    "Launch comparative benchmarks between digestif and mirage-crypto."
  in
  let man = [ `S Manpage.s_bugs ] in
  Term.info "bench" ~doc ~exits:Term.default_exits ~man

let () = Term.exit @@ Term.eval (bench_t, info)
