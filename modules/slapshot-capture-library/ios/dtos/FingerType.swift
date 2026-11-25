enum FingerType: String, Codable {
    /// Unknown finger type.
    case unknown = "UNKNOWN"

    /// Right thumb.
    case rt = "RT"

    /// Right index finger.
    case ri = "RI"

    /// Right middle finger.
    case rm = "RM"

    /// Right ring finger.
    case rr = "RR"

    /// Right little finger.
    case rl = "RL"

    /// Left thumb.
    case lt = "LT"

    /// Left index finger.
    case li = "LI"

    /// Left middle finger.
    case lm = "LM"

    /// Left ring finger.
    case lr = "LR"

    /// Left little finger.
    case ll = "LL"
    
    /// Plain right thumb
    case prt = "PRT"
    
    /// Plain left thumb
    case plt = "PLT"
    
    /// Right four finger slap
    case r4fs = "R4FS"
    
    /// Left four finger slap
    case l4fs = "L4FS"
    
    /// Thumbs slap
    case ts = "TS"

    /// Right full palm
    case rfp = "RFP"

    /// Right writer's palm
    case rwp = "RWP"

    /// Left full palm
    case lfp = "LFP"

    /// Left writer's palm
    case lwp = "LWP"
}
