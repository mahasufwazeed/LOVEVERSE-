#include "LVSupabaseRealtimeComponent.h"

void ULVSupabaseRealtimeComponent::Configure(const FLVSessionContext& Context)
{
    SessionContext = Context;
}

void ULVSupabaseRealtimeComponent::SimulateIncomingInteraction(ELVCoupleInteraction Interaction)
{
    OnInteractionReceived.Broadcast(Interaction);
}
