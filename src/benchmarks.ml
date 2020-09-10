open Bechamel
open Toolkit

type hash = [ `MD5 | `SHA1 | `SHA224 | `SHA256 | `SHA384 | `SHA512 ]
[@@deriving sexp]

type measure = [ `MONOTONIC_CLOCK | `MINOR | `MAJOR ]
type tested = { name : string; digestif : unit -> unit; mirage : unit -> unit }

let available_hashes : (string * hash) list =
  [
    ("md5", `MD5); ("sha1", `SHA1); ("sha224", `SHA224); ("sha256", `SHA256);
    ("sha384", `SHA384); ("sha512", `SHA512);
  ]

let string_of_hash v = Sexplib0.Sexp.to_string (sexp_of_hash v)

let benchmark tested instances =
  let ols =
    (* bootstrap ? r_square ? predictors= string pour texte (analyse ligne 134)
       ?*)
    Analyze.ols ~bootstrap:0 ~r_square:true ~predictors:Measure.[| run |]
  in
  let cfg =
    Benchmark.cfg ~start:1 ~sampling:(`Linear 10) ~run:2000
      ~quota:(Time.second 30.) ~kde:true ()
  in
  let raw_results = Benchmark.all cfg instances tested in
  let results =
    List.map (fun instance -> Analyze.all ols instance raw_results) instances
  in
  let results = Analyze.merge ols instances results in
  (results, raw_results)

(* Build the benchmarked functions structure: from a hash value to two functions
   calling the associated digestif and mirage-crypto hash functions.*)
let build_tested_functions (hash : hash) =
  let key = "This text may be replace by an argument at some point. Or not." in
  let key_cstruct =
    Cstruct.of_string
      "This text may be replace by an argument at some point. Or not."
  in
  let tested =
    let name = string_of_hash hash in
    match hash with
    | `MD5 ->
        {
          name;
          digestif = (fun () -> ignore (Digestif.MD5.digest_string key));
          mirage =
            (fun () -> ignore (Mirage_crypto.Hash.MD5.digest key_cstruct));
        }
    | `SHA1 ->
        {
          name;
          digestif = (fun () -> ignore (Digestif.SHA1.digest_string key));
          mirage =
            (fun () -> ignore (Mirage_crypto.Hash.SHA1.digest key_cstruct));
        }
    | `SHA224 ->
        {
          name;
          digestif = (fun () -> ignore (Digestif.SHA224.digest_string key));
          mirage =
            (fun () -> ignore (Mirage_crypto.Hash.SHA224.digest key_cstruct));
        }
    | `SHA256 ->
        {
          name;
          digestif = (fun () -> ignore (Digestif.SHA256.digest_string key));
          mirage =
            (fun () -> ignore (Mirage_crypto.Hash.SHA256.digest key_cstruct));
        }
    | `SHA384 ->
        {
          name;
          digestif = (fun () -> ignore (Digestif.SHA384.digest_string key));
          mirage =
            (fun () -> ignore (Mirage_crypto.Hash.SHA384.digest key_cstruct));
        }
    | `SHA512 ->
        {
          name;
          digestif = (fun () -> ignore (Digestif.SHA512.digest_string key));
          mirage =
            (fun () -> ignore (Mirage_crypto.Hash.SHA512.digest key_cstruct));
        }
  in
  [
    Test.make ~name:(tested.name ^ "/digestif") (Staged.stage tested.digestif);
    Test.make
      ~name:(tested.name ^ "/mirage-crypto")
      (Staged.stage tested.mirage);
  ]

(* Convert a measure value into a Bechamel.Measure.witness value *)
let instance_of_measure measure =
  match measure with
  | `MONOTONIC_CLOCK -> Instance.monotonic_clock
  | `MINOR -> Instance.minor_allocated
  | `MAJOR -> Instance.major_allocated

let display instance results =
  let res =
    let open Bechamel_js in
    emit ~dst:(Channel stdout)
      (fun _ -> Ok ())
      ~x_label:Measure.run ~y_label:(Measure.label instance) results
  in
  (match res with Ok () -> () | Error (`Msg err) -> invalid_arg err);
  if Sys.command "" = 1 then () else failwith "plop"

(* [main all hashed measure] generate the jason file with the benchmark results
   for the measure defined by [measure]. The benchmarked hash functions are
   every available ones in both digestif and mirage-crypto if [all] is truth and
   only the ones listed in [hashes] otherwise. *)
let main (all : bool) (hashes : hash list) (measure : measure) : unit =
  (* List of every functions (both from digestif and mirage-crypto we want to
     benchmark. *)
  let hashes =
    if all then List.map (fun (_, h) -> h) available_hashes else hashes
  in
  let tested =
    List.fold_left (fun t h -> build_tested_functions h @ t) [] hashes
  in
  let tested = Test.make_grouped ~name:"" ~fmt:"%s%s" tested in
  (* The wanted measure *)
  let instance = instance_of_measure measure in
  (* Benchmark analysed result and raw measures.*)
  let results = benchmark tested [ instance ] in
  (* Create the json output *)
  let res =
    let open Bechamel_js in
    emit ~dst:(Channel stdout)
      (fun _ -> Ok ())
      ~x_label:Measure.run ~y_label:(Measure.label instance) results
  in
  match res with Ok () -> () | Error (`Msg err) -> invalid_arg err
