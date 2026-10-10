#include "LVPixelStreamingBridge.h"

#include "Misc/CommandLine.h"
#include "Misc/Parse.h"

FLVSessionContext ULVPixelStreamingBridge::ReadSessionContextFromCommandLine() const
{
    FLVSessionContext Context;
    FParse::Value(FCommandLine::Get(), TEXT("coupleId="), Context.CoupleId);
    FParse::Value(FCommandLine::Get(), TEXT("userId="), Context.UserId);
    FParse::Value(FCommandLine::Get(), TEXT("supabaseUrl="), Context.SupabaseUrl);
    FParse::Value(FCommandLine::Get(), TEXT("supabaseAnonKey="), Context.SupabaseAnonKey);
    return Context;
}
