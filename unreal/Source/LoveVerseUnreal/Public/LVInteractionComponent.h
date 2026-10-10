#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "LVTypes.h"
#include "LVInteractionComponent.generated.h"

class ALVAvatarCharacter;
class ALVInteractionDirector;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FLVInteractionRequestReceived, ALVAvatarCharacter*, Requester, ELVCoupleInteraction, Interaction);

UCLASS(ClassGroup=(LoveVerse), meta=(BlueprintSpawnableComponent))
class LOVEVERSEUNREAL_API ULVInteractionComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    ULVInteractionComponent();

    UPROPERTY(EditInstanceOnly, BlueprintReadOnly, Category = "LoveVerse|Interaction")
    ALVInteractionDirector* InteractionDirector;

    UPROPERTY(BlueprintAssignable, Category = "LoveVerse|Interaction")
    FLVInteractionRequestReceived OnInteractionRequestReceived;

    UFUNCTION(BlueprintCallable, Category = "LoveVerse|Interaction")
    void RequestInteraction(ALVAvatarCharacter* Partner, ELVCoupleInteraction Interaction);

    UFUNCTION(BlueprintCallable, Category = "LoveVerse|Interaction")
    void RespondToPendingRequest(bool bAccepted);

    UFUNCTION(BlueprintPure, Category = "LoveVerse|Interaction")
    bool HasPendingRequest() const { return PendingRequester != nullptr; }

    UFUNCTION(BlueprintPure, Category = "LoveVerse|Interaction")
    ELVCoupleInteraction GetPendingInteraction() const { return PendingInteraction; }

protected:
    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

    UFUNCTION(Server, Reliable)
    void ServerRequestInteraction(ALVAvatarCharacter* Partner, ELVCoupleInteraction Interaction);

    UFUNCTION(Server, Reliable)
    void ServerRespondToPendingRequest(bool bAccepted);

private:
    UPROPERTY(ReplicatedUsing=OnRep_PendingRequest)
    ALVAvatarCharacter* PendingRequester;

    UPROPERTY(Replicated)
    ELVCoupleInteraction PendingInteraction = ELVCoupleInteraction::Idle;

    UFUNCTION()
    void OnRep_PendingRequest();

    void ClearPendingRequest();
};
