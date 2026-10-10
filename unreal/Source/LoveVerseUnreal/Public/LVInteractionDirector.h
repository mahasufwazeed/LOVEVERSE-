#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "LVTypes.h"
#include "LVInteractionDirector.generated.h"

class ALVAvatarCharacter;
class UParticleSystemComponent;

UCLASS(Blueprintable)
class LOVEVERSEUNREAL_API ALVInteractionDirector : public AActor
{
    GENERATED_BODY()

public:
    ALVInteractionDirector();

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    ALVAvatarCharacter* UserAvatar;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    ALVAvatarCharacter* PartnerAvatar;

    UFUNCTION(BlueprintCallable)
    void StartAuthorizedInteraction(ALVAvatarCharacter* Requester, ALVAvatarCharacter* Recipient, ELVCoupleInteraction Interaction);

    UFUNCTION(BlueprintCallable)
    void ResetToIdle();

protected:
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;

private:
    UFUNCTION(NetMulticast, Reliable)
    void MulticastPlayInteractionPose(ELVCoupleInteraction Interaction);

    UFUNCTION(NetMulticast, Reliable)
    void MulticastResetToIdle();

    bool CanStartInteraction(ALVAvatarCharacter* Requester, ALVAvatarCharacter* Recipient, ELVCoupleInteraction Interaction) const;
    FLVInteractionDefinition GetDefinition(ELVCoupleInteraction Interaction) const;
    void FinishInteraction();

    bool bApproaching = false;
    bool bInteractionPlaying = false;
    float ApproachStartedAt = 0.0f;
    float InteractionStartedAt = 0.0f;
    FVector UserApproachStart;
    FVector PartnerApproachStart;
    FVector UserTarget;
    FVector PartnerTarget;
    FLVInteractionDefinition ActiveDefinition;
    ELVCoupleInteraction ActiveInteraction = ELVCoupleInteraction::Idle;
};
