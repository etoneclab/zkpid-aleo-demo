program escrow.aleo;





function move_verified:
    input r0 as u64.private;
    input r1 as address.private;
    input r2 as signature.private;
    input r3 as field.private;
    sign.verify r2 aleo1mjuw6xpt58fcej6k04u270hzxl3q0jzgw68zda8enkf6pjy9ks8qvg2qgh r3 into r4;
    assert.eq true true;
    output r4 as boolean.private;


