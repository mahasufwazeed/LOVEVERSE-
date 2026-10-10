#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "LVTypes.h"
#include "LVSupabaseRealtimeComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLVInteractionReceived, ELVCoupleInteraction, Interaction);

UCLASS(ClassGroup=(LoveVerse), meta=(BlueprintSpawnableComponent))
class LOVEVERSEUNREAL_API ULVSupabaseRealtimeComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintAssignable)
    FLVInteractionReceived OnInteractionReceived;

    UFUNCTION(BlueprintCallable)
    void Configure(const FLVSessionContext& Context);

    UFUNCTION(BlueprintCallable)
    void SimulateIncomingInteraction(ELVCoupleInteraction Interaction);

private:
    FLVSessionContext SessionContext;
};
