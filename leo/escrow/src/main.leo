import credits.aleo;

program escrow.aleo {

  transition move_verified(amt: u64, ben_addr: address, sig: signature, msg: field) -> (credits.leo/credits) {
    let res: bool = verify_sig(sig, msg);
    assert(res);
    if(res) {
      let send_record: credits = caller_cred();
      let (ben_record, send_chg_record): (credits, credits) = credits.leo/transfer_public(send_record, ben_addr, amt);
    }
    return (send_chg_record);
  }

  inline get_addr_hash(a: address) -> field {
    return Poseidon2::hash_to_field(a);
  }

  inline verify_sig(s: signature, v: field) -> bool {
    let a: address = aleo1mjuw6xpt58fcej6k04u270hzxl3q0jzgw68zda8enkf6pjy9ks8qvg2qgh;
    return signature::verify(s, a, v);
  }

  inline caller_cred() -> (credits.leo/credits) {
    return credits { owner: self.Caller,  microcredits: 45079000u64.private, _nonce: 0group }
  }
}

